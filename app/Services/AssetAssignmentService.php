<?php

namespace App\Services;

use App\Enums\AssetCondition;
use App\Enums\AssetStatus;
use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AssetAssignmentService
{
    /**
     * Issue an available asset to an employee and open a custody record.
     */
    public function assign(
        Asset $asset,
        User $employee,
        User $actor,
        CarbonInterface $assignedAt,
        ?string $notes = null,
    ): AssetAssignment {
        if (! $asset->status->isIssuable()) {
            throw ValidationException::withMessages([
                'user_id' => "This asset cannot be issued while its status is {$asset->status->value}.",
            ]);
        }

        if (! $employee->isActive()) {
            throw ValidationException::withMessages(['user_id' => 'This employee account is inactive.']);
        }

        return DB::transaction(function () use ($asset, $employee, $actor, $assignedAt, $notes): AssetAssignment {
            $assignment = $asset->assignments()->create([
                'user_id' => $employee->id,
                'assigned_by_id' => $actor->id,
                'assigned_at' => $assignedAt,
                'notes' => $notes,
            ]);

            $asset->update([
                'status' => AssetStatus::Assigned,
                // The accountable department follows custody rather than being set by hand, so it
                // can never drift from whoever is actually holding the hardware.
                'department_id' => $employee->department_id,
            ]);

            return $assignment;
        });
    }

    /**
     * Close a custody record and return the asset to the available pool.
     */
    public function returnAsset(
        AssetAssignment $assignment,
        User $actor,
        CarbonInterface $returnedAt,
        AssetCondition $condition,
        ?string $returnNotes = null,
    ): void {
        if (! $assignment->isActive()) {
            throw ValidationException::withMessages(['returned_at' => 'This asset has already been returned.']);
        }

        if ($returnedAt->lessThan($assignment->assigned_at)) {
            throw ValidationException::withMessages(['returned_at' => 'The return date cannot be earlier than the issue date.']);
        }

        DB::transaction(function () use ($assignment, $actor, $returnedAt, $condition, $returnNotes): void {
            $assignment->update([
                'returned_at' => $returnedAt,
                'returned_by_id' => $actor->id,
                'return_notes' => $returnNotes,
            ]);

            $asset = $assignment->asset;

            $asset->update([
                'condition' => $condition,
                // Hardware still in the repair queue stays there; everything else rejoins the pool.
                'status' => $asset->status === AssetStatus::UnderRepair
                    ? AssetStatus::UnderRepair
                    : AssetStatus::Available,
                // Back in the shared pool, so no department is accountable for it until it is
                // issued again.
                'department_id' => null,
            ]);
        });
    }
}
