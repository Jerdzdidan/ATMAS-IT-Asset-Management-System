<?php

namespace App\Services;

use App\Enums\AssetStatus;
use App\Enums\MaintenanceRequestStatus;
use App\Enums\MaintenanceRequestType;
use App\Models\Asset;
use App\Models\MaintenanceRequest;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MaintenanceRequestService
{
    /**
     * Log an employee-reported hardware issue against the asset in their custody.
     */
    public function submit(
        Asset $asset,
        User $requester,
        MaintenanceRequestType $type,
        string $issueDescription,
    ): MaintenanceRequest {
        return $asset->maintenanceRequests()->create([
            'requested_by_id' => $requester->id,
            'request_type' => $type,
            'issue_description' => $issueDescription,
        ]);
    }

    /**
     * Move a request through the repair workflow and keep the asset status in step.
     */
    public function updateStatus(
        MaintenanceRequest $maintenanceRequest,
        User $actor,
        MaintenanceRequestStatus $status,
        ?string $resolutionNotes = null,
    ): void {
        if ($maintenanceRequest->status->isClosed()) {
            throw ValidationException::withMessages(['status' => 'This request has already been closed.']);
        }

        DB::transaction(function () use ($maintenanceRequest, $actor, $status, $resolutionNotes): void {
            $maintenanceRequest->update([
                'status' => $status,
                'handled_by_id' => $actor->id,
                'resolution_notes' => $resolutionNotes,
                'resolved_at' => $status->isClosed() ? now() : null,
            ]);

            $this->syncAssetStatus($maintenanceRequest->asset, $status);
        });
    }

    /**
     * Reflect the repair workflow on the asset without disturbing retired hardware.
     */
    private function syncAssetStatus(Asset $asset, MaintenanceRequestStatus $status): void
    {
        if ($asset->status->isRetired()) {
            return;
        }

        if ($status === MaintenanceRequestStatus::InProgress) {
            $asset->update(['status' => AssetStatus::UnderRepair]);

            return;
        }

        if ($asset->status !== AssetStatus::UnderRepair) {
            return;
        }

        // Closing the ticket hands the asset back to whoever still holds it.
        $asset->update([
            'status' => $asset->currentAssignment()->exists()
                ? AssetStatus::Assigned
                : AssetStatus::Available,
        ]);
    }
}
