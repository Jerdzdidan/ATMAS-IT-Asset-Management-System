<?php

namespace App\Http\Controllers\Employee;

use App\Enums\MaintenanceRequestType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Employee\StoreMaintenanceRequestRequest;
use App\Models\Asset;
use App\Models\MaintenanceRequest;
use App\Services\MaintenanceRequestService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MaintenanceRequestController extends Controller
{
    public function __construct(private MaintenanceRequestService $maintenanceRequestService) {}

    /**
     * Display the employee's own repair tickets and the hardware they may report on.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('employee/requests', [
            'requests' => MaintenanceRequest::query()
                ->with(['asset:id,asset_tag,name', 'handledBy:id,name'])
                ->where('requested_by_id', $request->user()->id)
                ->latest('id')
                ->get(),
            'assignedAssets' => Asset::query()
                ->select(['id', 'asset_tag', 'name'])
                ->heldBy($request->user()->id)
                ->orderBy('asset_tag')
                ->get(),
        ]);
    }

    /**
     * Log a hardware issue for equipment currently in the employee's custody.
     */
    public function store(StoreMaintenanceRequestRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $this->maintenanceRequestService->submit(
            Asset::findOrFail($validated['asset_id']),
            $request->user(),
            MaintenanceRequestType::from($validated['request_type']),
            $validated['issue_description'],
        );

        return to_route('employee.requests.index')->with('success', 'Maintenance request submitted successfully.');
    }
}
