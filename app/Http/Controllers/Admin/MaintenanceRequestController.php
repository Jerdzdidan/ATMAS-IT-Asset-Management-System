<?php

namespace App\Http\Controllers\Admin;

use App\Enums\MaintenanceRequestStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateMaintenanceRequestRequest;
use App\Models\MaintenanceRequest;
use App\Services\MaintenanceRequestService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MaintenanceRequestController extends Controller
{
    public function __construct(private MaintenanceRequestService $maintenanceRequestService) {}

    /**
     * Display the repair queue for the IT department.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('admin/maintenance-requests', [
            'requests' => MaintenanceRequest::query()
                ->with([
                    'asset:id,asset_tag,name',
                    'requestedBy:id,name,employee_code',
                    'handledBy:id,name',
                ])
                // Department heads only see tickets raised against their own department's hardware.
                ->whereHas('asset', fn (Builder $asset) => $asset->visibleTo($user))
                ->latest('id')
                ->get(),
        ]);
    }

    /**
     * Move the request through the repair workflow.
     */
    public function update(UpdateMaintenanceRequestRequest $request, MaintenanceRequest $maintenanceRequest): RedirectResponse
    {
        $validated = $request->validated();

        $this->maintenanceRequestService->updateStatus(
            $maintenanceRequest,
            $request->user(),
            MaintenanceRequestStatus::from($validated['status']),
            $validated['resolution_notes'] ?? null,
        );

        return back()->with('success', 'Maintenance request updated successfully.');
    }
}
