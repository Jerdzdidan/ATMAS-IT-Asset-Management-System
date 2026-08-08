<?php

namespace Database\Seeders;

use App\Enums\MaintenanceRequestStatus;
use App\Enums\MaintenanceRequestType;
use App\Enums\UserRole;
use App\Models\AssetAssignment;
use App\Models\User;
use App\Services\MaintenanceRequestService;
use Illuminate\Database\Seeder;

class MaintenanceRequestSeeder extends Seeder
{
    public function __construct(private MaintenanceRequestService $maintenanceRequestService) {}

    /**
     * Seed a repair queue that spans every stage of the maintenance workflow.
     */
    public function run(): void
    {
        $handler = User::query()->where('role', UserRole::ItStaff)->firstOrFail();

        $issues = [
            [MaintenanceRequestType::Repair, 'The laptop shuts down on its own after about an hour of use.'],
            [MaintenanceRequestType::Repair, 'The keyboard no longer registers several keys.'],
            [MaintenanceRequestType::Preventive, 'Requesting the scheduled cleaning and thermal paste replacement.'],
            [MaintenanceRequestType::Replacement, 'The battery no longer holds a charge and needs replacement.'],
        ];

        $assignments = AssetAssignment::query()
            ->active()
            ->with(['asset', 'user'])
            ->limit(count($issues))
            ->get();

        foreach ($assignments as $index => $assignment) {
            [$type, $description] = $issues[$index];

            $maintenanceRequest = $this->maintenanceRequestService->submit(
                $assignment->asset,
                $assignment->user,
                $type,
                $description,
            );

            // Leave the first ticket pending, work the second, and close the rest.
            match ($index) {
                0 => null,
                1 => $this->maintenanceRequestService->updateStatus(
                    $maintenanceRequest,
                    $handler,
                    MaintenanceRequestStatus::InProgress,
                ),
                default => $this->maintenanceRequestService->updateStatus(
                    $maintenanceRequest,
                    $handler,
                    MaintenanceRequestStatus::Resolved,
                    'Unit serviced and returned to the employee.',
                ),
            };
        }
    }
}
