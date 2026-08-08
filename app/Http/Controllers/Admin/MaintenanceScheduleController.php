<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AuditEvent;
use App\Enums\MaintenanceFrequency;
use App\Enums\MaintenanceRequestStatus;
use App\Enums\MaintenanceRequestType;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMaintenanceScheduleRequest;
use App\Http\Requests\UpdateMaintenanceScheduleRequest;
use App\Models\Asset;
use App\Models\MaintenanceSchedule;
use App\Services\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MaintenanceScheduleController extends Controller
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    /**
     * Display the preventive maintenance calendar.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $schedules = MaintenanceSchedule::query()
            ->with(['asset:id,asset_tag,name,department_id', 'asset.department:id,name'])
            ->whereHas('asset', fn (Builder $asset) => $asset->visibleTo($user))
            ->orderBy('next_due_on')
            ->get();

        return Inertia::render('admin/maintenance-schedules', [
            'schedules' => $schedules,
            'assets' => Asset::query()
                ->select(['id', 'asset_tag', 'name'])
                ->visibleTo($user)
                ->whereNot('status', 'RETIRED')
                ->orderBy('asset_tag')
                ->get(),
            'frequencies' => collect(MaintenanceFrequency::cases())
                ->map(fn (MaintenanceFrequency $frequency): array => [
                    'value' => $frequency->value,
                    'label' => $frequency->label(),
                ])
                ->all(),
            'statistics' => [
                'total' => $schedules->count(),
                'overdue' => $schedules->where('is_overdue', true)->count(),
                'due_this_month' => $schedules
                    ->where('is_overdue', false)
                    ->filter(fn (MaintenanceSchedule $schedule): bool => $schedule->days_until_due !== null && $schedule->days_until_due <= 30)
                    ->count(),
            ],
        ]);
    }

    /**
     * Attach a recurring maintenance plan to an asset.
     */
    public function store(StoreMaintenanceScheduleRequest $request): RedirectResponse
    {
        MaintenanceSchedule::create($request->validated());

        return back()->with('success', 'Maintenance schedule created successfully.');
    }

    /**
     * Amend an existing plan.
     */
    public function update(UpdateMaintenanceScheduleRequest $request, MaintenanceSchedule $maintenanceSchedule): RedirectResponse
    {
        $maintenanceSchedule->update($request->validated());

        return back()->with('success', 'Maintenance schedule updated successfully.');
    }

    /**
     * Record that the scheduled service was carried out and roll the plan forward.
     *
     * The completion is also written to the asset's maintenance history as a resolved
     * preventive ticket, so servicing and repairs read from one timeline.
     */
    public function complete(Request $request, MaintenanceSchedule $maintenanceSchedule): RedirectResponse
    {
        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $maintenanceSchedule->asset->maintenanceRequests()->create([
            'requested_by_id' => $request->user()->id,
            'handled_by_id' => $request->user()->id,
            'request_type' => MaintenanceRequestType::Preventive,
            'issue_description' => 'Scheduled maintenance: '.$maintenanceSchedule->title,
            'status' => MaintenanceRequestStatus::Resolved,
            'resolution_notes' => $validated['notes'] ?? 'Completed as scheduled.',
            'resolved_at' => now(),
        ]);

        $maintenanceSchedule->recordService();

        $this->auditLogger->record(
            AuditEvent::Serviced,
            $maintenanceSchedule->asset,
            sprintf(
                'Completed "%s" on asset %s; next due %s',
                $maintenanceSchedule->title,
                $maintenanceSchedule->asset->asset_tag,
                $maintenanceSchedule->next_due_on->toFormattedDateString(),
            ),
        );

        return back()->with('success', 'Service logged. The next visit has been scheduled.');
    }

    /**
     * Remove a plan that no longer applies.
     */
    public function destroy(MaintenanceSchedule $maintenanceSchedule): RedirectResponse
    {
        $maintenanceSchedule->delete();

        return back()->with('success', 'Maintenance schedule deleted successfully.');
    }
}
