<?php

namespace App\Http\Controllers;

use App\Enums\AssetStatus;
use App\Enums\MaintenanceRequestStatus;
use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\MaintenanceRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Render the dashboard that matches the signed-in user's role.
     */
    public function __invoke(Request $request): Response
    {
        return $request->user()->viewsRegister()
            ? $this->registerDashboard($request->user())
            : $this->employeeDashboard($request);
    }

    /**
     * Summarize the hardware register for every role that can read it.
     *
     * The figures are narrowed to the viewer's own department when their role is scoped,
     * so a department head's totals only ever describe their own hardware.
     */
    private function registerDashboard(User $user): Response
    {
        /** @var array<string, int> $statusCounts */
        $statusCounts = Asset::query()
            ->visibleTo($user)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        return Inertia::render('dashboard', [
            'statistics' => [
                'total_assets' => array_sum($statusCounts),
                'available' => $statusCounts[AssetStatus::Available->value] ?? 0,
                'assigned' => $statusCounts[AssetStatus::Assigned->value] ?? 0,
                'under_repair' => $statusCounts[AssetStatus::UnderRepair->value] ?? 0,
                'retired' => $statusCounts[AssetStatus::Retired->value] ?? 0,
                'open_requests' => MaintenanceRequest::query()
                    ->whereIn('status', [MaintenanceRequestStatus::Pending, MaintenanceRequestStatus::InProgress])
                    ->whereHas('asset', fn (Builder $asset) => $asset->visibleTo($user))
                    ->count(),
            ],
            'recentAssignments' => AssetAssignment::query()
                ->with(['asset:id,asset_tag,name', 'user:id,name'])
                ->whereHas('asset', fn (Builder $asset) => $asset->visibleTo($user))
                ->latest('assigned_at')
                ->latest('id')
                ->limit(5)
                ->get(),
            'recentRequests' => MaintenanceRequest::query()
                ->with(['asset:id,asset_tag,name', 'requestedBy:id,name'])
                ->whereHas('asset', fn (Builder $asset) => $asset->visibleTo($user))
                ->latest('id')
                ->limit(5)
                ->get(),
        ]);
    }

    /**
     * Summarize the employee's own accountability and open tickets.
     */
    private function employeeDashboard(Request $request): Response
    {
        $userId = $request->user()->id;

        return Inertia::render('employee/dashboard', [
            'assignedAssets' => Asset::query()
                ->select(['id', 'asset_tag', 'name', 'asset_category_id', 'status', 'condition'])
                ->with('category:id,name')
                ->heldBy($userId)
                ->orderBy('asset_tag')
                ->get(),
            'openRequestCount' => MaintenanceRequest::query()
                ->where('requested_by_id', $userId)
                ->whereIn('status', [MaintenanceRequestStatus::Pending, MaintenanceRequestStatus::InProgress])
                ->count(),
            'recentRequests' => MaintenanceRequest::query()
                ->with('asset:id,asset_tag,name')
                ->where('requested_by_id', $userId)
                ->latest('id')
                ->limit(5)
                ->get(),
        ]);
    }
}
