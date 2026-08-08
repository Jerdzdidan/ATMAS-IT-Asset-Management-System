<?php

namespace App\Services;

use App\Enums\AssetCondition;
use App\Enums\AssetStatus;
use App\Enums\MaintenanceRequestStatus;
use App\Models\ActivityLog;
use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\Department;
use App\Models\MaintenanceRequest;
use App\Models\MaintenanceSchedule;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Produces the reports the organisation asked for in the interview.
 *
 * Every report is described by the same shape — headline figures plus a table — so one page,
 * one Excel exporter, and one PDF template serve all of them.
 */
class ReportBuilder
{
    /**
     * Number of days ahead that still counts as "expiring soon" for warranty reporting.
     */
    private const WARRANTY_HORIZON_DAYS = 90;

    /**
     * The catalogue of available reports.
     *
     * @return array<string, array{title: string, description: string, group: string, filters: list<string>}>
     */
    public function definitions(): array
    {
        return [
            'inventory' => [
                'title' => 'Comprehensive Asset Inventory',
                'description' => 'Every registered asset with its accountability, condition, and cost.',
                'group' => 'Inventory',
                'filters' => ['department', 'category', 'status'],
            ],
            'employee-assets' => [
                'title' => 'Assets Assigned to Each Employee',
                'description' => 'Who is currently holding what, and since when.',
                'group' => 'Inventory',
                'filters' => ['department'],
            ],
            'department-distribution' => [
                'title' => 'Departmental Asset Distribution',
                'description' => 'How the hardware and its value are spread across departments.',
                'group' => 'Inventory',
                'filters' => [],
            ],
            'warranty' => [
                'title' => 'Warranty Expiration Overview',
                'description' => 'Coverage still running, expiring soon, and already lapsed.',
                'group' => 'Lifecycle',
                'filters' => ['department', 'category'],
            ],
            'maintenance-history' => [
                'title' => 'Asset Maintenance and Repair History',
                'description' => 'Every repair and preventive service logged against the register.',
                'group' => 'Lifecycle',
                'filters' => ['department', 'dates'],
            ],
            'damaged-retired' => [
                'title' => 'Damaged and Retired Assets',
                'description' => 'Hardware out of service, in poor condition, or written off.',
                'group' => 'Lifecycle',
                'filters' => ['department', 'category'],
            ],
            'acquisitions' => [
                'title' => 'New Asset Acquisition Overview',
                'description' => 'What was bought in the period and what it cost.',
                'group' => 'Finance',
                'filters' => ['department', 'category', 'dates'],
            ],
            'movement' => [
                'title' => 'Asset Movement and Transfer Documentation',
                'description' => 'The issue and return trail for custody handovers.',
                'group' => 'Audit',
                'filters' => ['department', 'dates'],
            ],
            'audit-inventory' => [
                'title' => 'Audit Inventory Overview',
                'description' => 'Physical count sheet with the last recorded activity per asset.',
                'group' => 'Audit',
                'filters' => ['department', 'category'],
            ],
            'management-summary' => [
                'title' => 'Management Summary',
                'description' => 'Portfolio KPIs rolled up by department for budget decisions.',
                'group' => 'Audit',
                'filters' => [],
            ],
        ];
    }

    /**
     * Build one report.
     *
     * @param  array{department_id?: int|null, category_id?: int|null, status?: string|null, from?: string|null, to?: string|null}  $filters
     * @return array{key: string, title: string, description: string, columns: list<array{key: string, label: string, align?: string}>, rows: list<array<string, mixed>>, summary: list<array{label: string, value: string}>}
     */
    public function build(string $key, User $viewer, array $filters = []): array
    {
        $definition = $this->definitions()[$key] ?? throw new \InvalidArgumentException("Unknown report [{$key}].");

        /** @var array{columns: list<array{key: string, label: string, align?: string}>, rows: list<array<string, mixed>>, summary: list<array{label: string, value: string}>} $payload */
        $payload = match ($key) {
            'inventory' => $this->inventory($viewer, $filters),
            'employee-assets' => $this->employeeAssets($viewer, $filters),
            'department-distribution' => $this->departmentDistribution($viewer),
            'warranty' => $this->warranty($viewer, $filters),
            'maintenance-history' => $this->maintenanceHistory($viewer, $filters),
            'damaged-retired' => $this->damagedAndRetired($viewer, $filters),
            'acquisitions' => $this->acquisitions($viewer, $filters),
            'movement' => $this->movement($viewer, $filters),
            'audit-inventory' => $this->auditInventory($viewer, $filters),
            'management-summary' => $this->managementSummary($viewer),
        };

        return [
            'key' => $key,
            'title' => $definition['title'],
            'description' => $definition['description'],
            ...$payload,
        ];
    }

    /**
     * Comprehensive Asset Inventory Report.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function inventory(User $viewer, array $filters): array
    {
        $assets = $this->assetQuery($viewer, $filters)
            ->with(['category:id,name', 'department:id,name', 'currentAssignment.user:id,name'])
            ->orderBy('asset_tag')
            ->get();

        return [
            'columns' => [
                ['key' => 'asset_tag', 'label' => 'Asset Tag'],
                ['key' => 'name', 'label' => 'Asset'],
                ['key' => 'category', 'label' => 'Category'],
                ['key' => 'department', 'label' => 'Department'],
                ['key' => 'brand_model', 'label' => 'Brand / Model'],
                ['key' => 'serial_number', 'label' => 'Serial'],
                ['key' => 'status', 'label' => 'Status'],
                ['key' => 'condition', 'label' => 'Condition'],
                ['key' => 'location', 'label' => 'Location'],
                ['key' => 'assigned_to', 'label' => 'Assigned To'],
                ['key' => 'purchase_cost', 'label' => 'Cost', 'align' => 'right'],
            ],
            'rows' => $assets->map(fn (Asset $asset): array => [
                'asset_tag' => $asset->asset_tag,
                'name' => $asset->name,
                'category' => $asset->category?->name ?? '—',
                'department' => $asset->department?->name ?? '—',
                'brand_model' => trim($asset->brand.' '.$asset->model) ?: '—',
                'serial_number' => $asset->serial_number ?? '—',
                'status' => $asset->status->value,
                'condition' => $asset->condition->value,
                'location' => $asset->location ?? '—',
                'assigned_to' => $asset->currentAssignment?->user?->name ?? '—',
                'purchase_cost' => $this->money($asset->purchase_cost),
            ])->all(),
            'summary' => [
                ['label' => 'Assets listed', 'value' => (string) $assets->count()],
                ['label' => 'Total acquisition value', 'value' => $this->money($assets->sum(fn (Asset $asset): float => (float) $asset->purchase_cost))],
                ['label' => 'In custody', 'value' => (string) $assets->where('status', AssetStatus::Assigned)->count()],
                ['label' => 'Available', 'value' => (string) $assets->where('status', AssetStatus::Available)->count()],
            ],
        ];
    }

    /**
     * Assets Assigned to Each Employee.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function employeeAssets(User $viewer, array $filters): array
    {
        $assignments = AssetAssignment::query()
            ->with(['asset:id,asset_tag,name,asset_category_id,department_id', 'asset.category:id,name', 'user:id,name,employee_code,department_id', 'user.department:id,name'])
            ->active()
            ->whereHas('asset', fn (Builder $asset) => $asset->visibleTo($viewer))
            ->when(
                $filters['department_id'] ?? null,
                fn (Builder $query, int $departmentId) => $query->whereHas('asset', fn (Builder $asset) => $asset->where('department_id', $departmentId)),
            )
            ->get()
            ->sortBy(fn (AssetAssignment $assignment): string => $assignment->user?->name ?? '');

        return [
            'columns' => [
                ['key' => 'employee', 'label' => 'Employee'],
                ['key' => 'employee_code', 'label' => 'Employee No.'],
                ['key' => 'department', 'label' => 'Department'],
                ['key' => 'asset_tag', 'label' => 'Asset Tag'],
                ['key' => 'asset', 'label' => 'Asset'],
                ['key' => 'category', 'label' => 'Category'],
                ['key' => 'assigned_at', 'label' => 'Issued On'],
                ['key' => 'days_held', 'label' => 'Days Held', 'align' => 'right'],
            ],
            'rows' => $assignments->map(fn (AssetAssignment $assignment): array => [
                'employee' => $assignment->user?->name ?? '—',
                'employee_code' => $assignment->user?->employee_code ?? '—',
                'department' => $assignment->user?->department?->name ?? '—',
                'asset_tag' => $assignment->asset?->asset_tag ?? '—',
                'asset' => $assignment->asset?->name ?? '—',
                'category' => $assignment->asset?->category?->name ?? '—',
                'assigned_at' => $assignment->assigned_at?->toDateString() ?? '—',
                'days_held' => $assignment->assigned_at === null ? '—' : (string) (int) $assignment->assigned_at->diffInDays(now()),
            ])->values()->all(),
            'summary' => [
                ['label' => 'Assets in custody', 'value' => (string) $assignments->count()],
                ['label' => 'Employees holding assets', 'value' => (string) $assignments->pluck('user_id')->unique()->count()],
                ['label' => 'Longest holding', 'value' => $this->longestHolding($assignments)],
            ],
        ];
    }

    /**
     * Departmental Asset Distribution.
     *
     * @return array<string, mixed>
     */
    private function departmentDistribution(User $viewer): array
    {
        $assets = Asset::query()->visibleTo($viewer)->with('department:id,name,code')->get();

        $rows = $assets
            ->groupBy(fn (Asset $asset): string => $asset->department?->name ?? 'Unassigned')
            ->map(fn (Collection $group, string $department): array => [
                'department' => $department,
                'code' => $group->first()->department?->code ?? '—',
                'total' => (string) $group->count(),
                'available' => (string) $group->where('status', AssetStatus::Available)->count(),
                'assigned' => (string) $group->where('status', AssetStatus::Assigned)->count(),
                'under_repair' => (string) $group->where('status', AssetStatus::UnderRepair)->count(),
                'retired' => (string) $group->where('status', AssetStatus::Retired)->count(),
                'value' => $this->money($group->sum(fn (Asset $asset): float => (float) $asset->purchase_cost)),
            ])
            ->sortByDesc(fn (array $row): int => (int) $row['total'])
            ->values()
            ->all();

        return [
            'columns' => [
                ['key' => 'department', 'label' => 'Department'],
                ['key' => 'code', 'label' => 'Code'],
                ['key' => 'total', 'label' => 'Total', 'align' => 'right'],
                ['key' => 'available', 'label' => 'Available', 'align' => 'right'],
                ['key' => 'assigned', 'label' => 'Assigned', 'align' => 'right'],
                ['key' => 'under_repair', 'label' => 'Under Repair', 'align' => 'right'],
                ['key' => 'retired', 'label' => 'Retired', 'align' => 'right'],
                ['key' => 'value', 'label' => 'Acquisition Value', 'align' => 'right'],
            ],
            'rows' => $rows,
            'summary' => [
                ['label' => 'Departments holding assets', 'value' => (string) count($rows)],
                ['label' => 'Assets registered', 'value' => (string) $assets->count()],
                ['label' => 'Without a department', 'value' => (string) $assets->whereNull('department_id')->count()],
            ],
        ];
    }

    /**
     * Warranty Expiration Overview.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function warranty(User $viewer, array $filters): array
    {
        $assets = $this->assetQuery($viewer, $filters)
            ->with(['department:id,name'])
            ->whereNotNull('warranty_expires_at')
            ->orderBy('warranty_expires_at')
            ->get();

        $today = now()->startOfDay();
        $horizon = $today->copy()->addDays(self::WARRANTY_HORIZON_DAYS);

        $rows = $assets->map(function (Asset $asset) use ($today): array {
            $daysRemaining = (int) $today->diffInDays($asset->warranty_expires_at, false);

            return [
                'asset_tag' => $asset->asset_tag,
                'name' => $asset->name,
                'department' => $asset->department?->name ?? '—',
                'purchase_date' => $asset->purchase_date?->toDateString() ?? '—',
                'warranty_expires_at' => $asset->warranty_expires_at->toDateString(),
                'days_remaining' => (string) $daysRemaining,
                'state' => match (true) {
                    $daysRemaining < 0 => 'Expired',
                    $daysRemaining <= self::WARRANTY_HORIZON_DAYS => 'Expiring soon',
                    default => 'Covered',
                },
            ];
        })->all();

        return [
            'columns' => [
                ['key' => 'asset_tag', 'label' => 'Asset Tag'],
                ['key' => 'name', 'label' => 'Asset'],
                ['key' => 'department', 'label' => 'Department'],
                ['key' => 'purchase_date', 'label' => 'Purchased'],
                ['key' => 'warranty_expires_at', 'label' => 'Warranty Ends'],
                ['key' => 'days_remaining', 'label' => 'Days Left', 'align' => 'right'],
                ['key' => 'state', 'label' => 'State'],
            ],
            'rows' => $rows,
            'summary' => [
                ['label' => 'Expired', 'value' => (string) $assets->filter(fn (Asset $asset): bool => $asset->warranty_expires_at->lt($today))->count()],
                ['label' => 'Expiring within '.self::WARRANTY_HORIZON_DAYS.' days', 'value' => (string) $assets->filter(
                    fn (Asset $asset): bool => $asset->warranty_expires_at->gte($today) && $asset->warranty_expires_at->lte($horizon),
                )->count()],
                ['label' => 'Still covered', 'value' => (string) $assets->filter(fn (Asset $asset): bool => $asset->warranty_expires_at->gt($horizon))->count()],
                ['label' => 'No warranty recorded', 'value' => (string) $this->assetQuery($viewer, $filters)->whereNull('warranty_expires_at')->count()],
            ],
        ];
    }

    /**
     * History of Asset Maintenance and Repairs.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function maintenanceHistory(User $viewer, array $filters): array
    {
        $requests = MaintenanceRequest::query()
            ->with(['asset:id,asset_tag,name,department_id', 'asset.department:id,name', 'requestedBy:id,name', 'handledBy:id,name'])
            ->whereHas('asset', fn (Builder $asset) => $asset->visibleTo($viewer))
            ->when(
                $filters['department_id'] ?? null,
                fn (Builder $query, int $departmentId) => $query->whereHas('asset', fn (Builder $asset) => $asset->where('department_id', $departmentId)),
            )
            ->when($filters['from'] ?? null, fn (Builder $query, string $from) => $query->whereDate('created_at', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $query, string $to) => $query->whereDate('created_at', '<=', $to))
            ->latest('id')
            ->get();

        $resolved = $requests->where('status', MaintenanceRequestStatus::Resolved);

        return [
            'columns' => [
                ['key' => 'logged_at', 'label' => 'Logged'],
                ['key' => 'asset_tag', 'label' => 'Asset Tag'],
                ['key' => 'asset', 'label' => 'Asset'],
                ['key' => 'department', 'label' => 'Department'],
                ['key' => 'request_type', 'label' => 'Type'],
                ['key' => 'issue_description', 'label' => 'Issue'],
                ['key' => 'status', 'label' => 'Status'],
                ['key' => 'handled_by', 'label' => 'Handled By'],
                ['key' => 'turnaround', 'label' => 'Days to Resolve', 'align' => 'right'],
            ],
            'rows' => $requests->map(fn (MaintenanceRequest $request): array => [
                'logged_at' => $request->created_at?->toDateString() ?? '—',
                'asset_tag' => $request->asset?->asset_tag ?? '—',
                'asset' => $request->asset?->name ?? '—',
                'department' => $request->asset?->department?->name ?? '—',
                'request_type' => $request->request_type->value,
                'issue_description' => $request->issue_description,
                'status' => $request->status->value,
                'handled_by' => $request->handledBy?->name ?? '—',
                'turnaround' => $this->turnaroundDays($request),
            ])->all(),
            'summary' => [
                ['label' => 'Tickets logged', 'value' => (string) $requests->count()],
                ['label' => 'Resolved', 'value' => (string) $resolved->count()],
                ['label' => 'Still open', 'value' => (string) $requests->whereIn('status', [MaintenanceRequestStatus::Pending, MaintenanceRequestStatus::InProgress])->count()],
                ['label' => 'Average turnaround', 'value' => $this->averageTurnaround($resolved)],
            ],
        ];
    }

    /**
     * Report on Damaged or Retired Assets.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function damagedAndRetired(User $viewer, array $filters): array
    {
        $assets = $this->assetQuery($viewer, $filters)
            ->with(['category:id,name', 'department:id,name'])
            ->where(function (Builder $query): void {
                $query->whereIn('status', [AssetStatus::Retired->value, AssetStatus::UnderRepair->value])
                    ->orWhere('condition', AssetCondition::Poor->value);
            })
            ->orderBy('status')
            ->orderBy('asset_tag')
            ->get();

        return [
            'columns' => [
                ['key' => 'asset_tag', 'label' => 'Asset Tag'],
                ['key' => 'name', 'label' => 'Asset'],
                ['key' => 'category', 'label' => 'Category'],
                ['key' => 'department', 'label' => 'Department'],
                ['key' => 'status', 'label' => 'Status'],
                ['key' => 'condition', 'label' => 'Condition'],
                ['key' => 'purchase_date', 'label' => 'Purchased'],
                ['key' => 'purchase_cost', 'label' => 'Cost', 'align' => 'right'],
                ['key' => 'remarks', 'label' => 'Remarks'],
            ],
            'rows' => $assets->map(fn (Asset $asset): array => [
                'asset_tag' => $asset->asset_tag,
                'name' => $asset->name,
                'category' => $asset->category?->name ?? '—',
                'department' => $asset->department?->name ?? '—',
                'status' => $asset->status->value,
                'condition' => $asset->condition->value,
                'purchase_date' => $asset->purchase_date?->toDateString() ?? '—',
                'purchase_cost' => $this->money($asset->purchase_cost),
                'remarks' => $asset->remarks ?? '—',
            ])->all(),
            'summary' => [
                ['label' => 'Retired', 'value' => (string) $assets->where('status', AssetStatus::Retired)->count()],
                ['label' => 'Under repair', 'value' => (string) $assets->where('status', AssetStatus::UnderRepair)->count()],
                ['label' => 'In poor condition', 'value' => (string) $assets->where('condition', AssetCondition::Poor)->count()],
                ['label' => 'Acquisition value affected', 'value' => $this->money($assets->sum(fn (Asset $asset): float => (float) $asset->purchase_cost))],
            ],
        ];
    }

    /**
     * New Asset Acquisition Overview.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function acquisitions(User $viewer, array $filters): array
    {
        $assets = $this->assetQuery($viewer, $filters)
            ->with(['category:id,name', 'department:id,name'])
            ->whereNotNull('purchase_date')
            ->when($filters['from'] ?? null, fn (Builder $query, string $from) => $query->whereDate('purchase_date', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $query, string $to) => $query->whereDate('purchase_date', '<=', $to))
            ->orderByDesc('purchase_date')
            ->get();

        $totalSpend = $assets->sum(fn (Asset $asset): float => (float) $asset->purchase_cost);

        return [
            'columns' => [
                ['key' => 'purchase_date', 'label' => 'Purchased'],
                ['key' => 'asset_tag', 'label' => 'Asset Tag'],
                ['key' => 'name', 'label' => 'Asset'],
                ['key' => 'category', 'label' => 'Category'],
                ['key' => 'department', 'label' => 'Department'],
                ['key' => 'brand_model', 'label' => 'Brand / Model'],
                ['key' => 'condition', 'label' => 'Condition'],
                ['key' => 'purchase_cost', 'label' => 'Cost', 'align' => 'right'],
            ],
            'rows' => $assets->map(fn (Asset $asset): array => [
                'purchase_date' => $asset->purchase_date->toDateString(),
                'asset_tag' => $asset->asset_tag,
                'name' => $asset->name,
                'category' => $asset->category?->name ?? '—',
                'department' => $asset->department?->name ?? '—',
                'brand_model' => trim($asset->brand.' '.$asset->model) ?: '—',
                'condition' => $asset->condition->value,
                'purchase_cost' => $this->money($asset->purchase_cost),
            ])->all(),
            'summary' => [
                ['label' => 'Units acquired', 'value' => (string) $assets->count()],
                ['label' => 'Total spend', 'value' => $this->money($totalSpend)],
                ['label' => 'Average unit cost', 'value' => $this->money($assets->count() === 0 ? 0 : $totalSpend / $assets->count())],
                ['label' => 'Categories covered', 'value' => (string) $assets->pluck('asset_category_id')->unique()->count()],
            ],
        ];
    }

    /**
     * Asset Movement or Transfer Documentation.
     *
     * Issues and returns are unrolled into one dated stream so the sheet reads like a logbook.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function movement(User $viewer, array $filters): array
    {
        $assignments = AssetAssignment::query()
            ->with(['asset:id,asset_tag,name,department_id', 'asset.department:id,name', 'user:id,name', 'assignedBy:id,name', 'returnedBy:id,name'])
            ->whereHas('asset', fn (Builder $asset) => $asset->visibleTo($viewer))
            ->when(
                $filters['department_id'] ?? null,
                fn (Builder $query, int $departmentId) => $query->whereHas('asset', fn (Builder $asset) => $asset->where('department_id', $departmentId)),
            )
            ->get();

        $movements = collect();

        foreach ($assignments as $assignment) {
            $movements->push($this->movementRow($assignment, 'Issued', $assignment->assigned_at, $assignment->assignedBy?->name, $assignment->notes));

            if ($assignment->returned_at !== null) {
                $movements->push($this->movementRow($assignment, 'Returned', $assignment->returned_at, $assignment->returnedBy?->name, $assignment->return_notes));
            }
        }

        $movements = $movements
            ->filter(fn (array $row): bool => $this->withinRange($row['sort'], $filters))
            ->sortByDesc('sort')
            ->values();

        return [
            'columns' => [
                ['key' => 'date', 'label' => 'Date'],
                ['key' => 'movement', 'label' => 'Movement'],
                ['key' => 'asset_tag', 'label' => 'Asset Tag'],
                ['key' => 'asset', 'label' => 'Asset'],
                ['key' => 'department', 'label' => 'Department'],
                ['key' => 'employee', 'label' => 'Employee'],
                ['key' => 'processed_by', 'label' => 'Processed By'],
                ['key' => 'notes', 'label' => 'Notes'],
            ],
            'rows' => $movements->map(fn (array $row): array => collect($row)->except('sort')->all())->all(),
            'summary' => [
                ['label' => 'Movements recorded', 'value' => (string) $movements->count()],
                ['label' => 'Issues', 'value' => (string) $movements->where('movement', 'Issued')->count()],
                ['label' => 'Returns', 'value' => (string) $movements->where('movement', 'Returned')->count()],
                ['label' => 'Assets still out', 'value' => (string) $assignments->whereNull('returned_at')->count()],
            ],
        ];
    }

    /**
     * Audit Inventory Overview.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function auditInventory(User $viewer, array $filters): array
    {
        $assets = $this->assetQuery($viewer, $filters)
            ->with(['category:id,name', 'department:id,name', 'currentAssignment.user:id,name'])
            ->orderBy('asset_tag')
            ->get();

        $lastTouched = ActivityLog::query()
            ->where('subject_type', 'Asset')
            ->whereIn('subject_id', $assets->pluck('id'))
            ->orderByDesc('id')
            ->get(['subject_id', 'actor_name', 'created_at', 'description'])
            ->unique('subject_id')
            ->keyBy('subject_id');

        return [
            'columns' => [
                ['key' => 'asset_tag', 'label' => 'Asset Tag'],
                ['key' => 'name', 'label' => 'Asset'],
                ['key' => 'category', 'label' => 'Category'],
                ['key' => 'department', 'label' => 'Department'],
                ['key' => 'serial_number', 'label' => 'Serial'],
                ['key' => 'status', 'label' => 'Status'],
                ['key' => 'accountable', 'label' => 'Accountable'],
                ['key' => 'last_activity', 'label' => 'Last Activity'],
                ['key' => 'last_actor', 'label' => 'By'],
                ['key' => 'verified', 'label' => 'Physically Verified'],
            ],
            'rows' => $assets->map(fn (Asset $asset): array => [
                'asset_tag' => $asset->asset_tag,
                'name' => $asset->name,
                'category' => $asset->category?->name ?? '—',
                'department' => $asset->department?->name ?? '—',
                'serial_number' => $asset->serial_number ?? 'NOT RECORDED',
                'status' => $asset->status->value,
                'accountable' => $asset->currentAssignment?->user?->name ?? 'Store',
                'last_activity' => $lastTouched->get($asset->id)?->created_at?->toDateString() ?? '—',
                'last_actor' => $lastTouched->get($asset->id)?->actor_name ?? '—',
                // Left blank on purpose: the auditor ticks this column on the printed sheet.
                'verified' => '',
            ])->all(),
            'summary' => [
                ['label' => 'Assets to count', 'value' => (string) $assets->count()],
                ['label' => 'Missing a serial number', 'value' => (string) $assets->whereNull('serial_number')->count()],
                ['label' => 'Missing a department', 'value' => (string) $assets->whereNull('department_id')->count()],
                ['label' => 'No recorded activity', 'value' => (string) $assets->filter(fn (Asset $asset): bool => ! $lastTouched->has($asset->id))->count()],
            ],
        ];
    }

    /**
     * Management Summary Dashboard.
     *
     * @return array<string, mixed>
     */
    private function managementSummary(User $viewer): array
    {
        $assets = Asset::query()->visibleTo($viewer)->with('department:id,name')->get();
        $openTickets = MaintenanceRequest::query()
            ->whereIn('status', [MaintenanceRequestStatus::Pending, MaintenanceRequestStatus::InProgress])
            ->whereHas('asset', fn (Builder $asset) => $asset->visibleTo($viewer))
            ->with('asset:id,department_id')
            ->get();
        $overduePlans = MaintenanceSchedule::query()
            ->where('is_active', true)
            ->whereDate('next_due_on', '<', now()->toDateString())
            ->whereHas('asset', fn (Builder $asset) => $asset->visibleTo($viewer))
            ->with('asset:id,department_id')
            ->get();

        $rows = $assets
            ->groupBy(fn (Asset $asset): string => $asset->department?->name ?? 'Unassigned')
            ->map(function (Collection $group, string $department) use ($openTickets, $overduePlans): array {
                $departmentId = $group->first()->department_id;
                $inService = $group->whereNotIn('status', [AssetStatus::Retired])->count();

                return [
                    'department' => $department,
                    'assets' => (string) $group->count(),
                    'in_service' => (string) $inService,
                    'utilisation' => $inService === 0 ? '0%' : round($group->where('status', AssetStatus::Assigned)->count() / $inService * 100).'%',
                    'value' => $this->money($group->sum(fn (Asset $asset): float => (float) $asset->purchase_cost)),
                    'open_tickets' => (string) $openTickets->filter(fn (MaintenanceRequest $ticket): bool => $ticket->asset?->department_id === $departmentId)->count(),
                    'overdue_maintenance' => (string) $overduePlans->filter(fn (MaintenanceSchedule $plan): bool => $plan->asset?->department_id === $departmentId)->count(),
                ];
            })
            ->sortByDesc(fn (array $row): int => (int) $row['assets'])
            ->values()
            ->all();

        $inService = $assets->whereNotIn('status', [AssetStatus::Retired])->count();

        return [
            'columns' => [
                ['key' => 'department', 'label' => 'Department'],
                ['key' => 'assets', 'label' => 'Assets', 'align' => 'right'],
                ['key' => 'in_service', 'label' => 'In Service', 'align' => 'right'],
                ['key' => 'utilisation', 'label' => 'Utilisation', 'align' => 'right'],
                ['key' => 'value', 'label' => 'Acquisition Value', 'align' => 'right'],
                ['key' => 'open_tickets', 'label' => 'Open Tickets', 'align' => 'right'],
                ['key' => 'overdue_maintenance', 'label' => 'Overdue PM', 'align' => 'right'],
            ],
            'rows' => $rows,
            'summary' => [
                ['label' => 'Total portfolio value', 'value' => $this->money($assets->sum(fn (Asset $asset): float => (float) $asset->purchase_cost))],
                ['label' => 'Assets in service', 'value' => $inService.' of '.$assets->count()],
                ['label' => 'Utilisation', 'value' => $inService === 0 ? '0%' : round($assets->where('status', AssetStatus::Assigned)->count() / $inService * 100).'%'],
                ['label' => 'Open tickets', 'value' => (string) $openTickets->count()],
                ['label' => 'Overdue maintenance', 'value' => (string) $overduePlans->count()],
            ],
        ];
    }

    /**
     * The base asset query with the shared filters applied.
     *
     * @param  array<string, mixed>  $filters
     * @return Builder<Asset>
     */
    private function assetQuery(User $viewer, array $filters): Builder
    {
        return Asset::query()
            ->visibleTo($viewer)
            ->when($filters['department_id'] ?? null, fn (Builder $query, int $id) => $query->where('department_id', $id))
            ->when($filters['category_id'] ?? null, fn (Builder $query, int $id) => $query->where('asset_category_id', $id))
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status));
    }

    /**
     * Assemble one line of the movement logbook.
     *
     * @return array<string, mixed>
     */
    private function movementRow(AssetAssignment $assignment, string $movement, ?Carbon $at, ?string $processedBy, ?string $notes): array
    {
        return [
            'sort' => $at,
            'date' => $at?->toDateTimeString() ?? '—',
            'movement' => $movement,
            'asset_tag' => $assignment->asset?->asset_tag ?? '—',
            'asset' => $assignment->asset?->name ?? '—',
            'department' => $assignment->asset?->department?->name ?? '—',
            'employee' => $assignment->user?->name ?? '—',
            'processed_by' => $processedBy ?? '—',
            'notes' => $notes ?? '—',
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function withinRange(?Carbon $at, array $filters): bool
    {
        if ($at === null) {
            return false;
        }

        if (filled($filters['from'] ?? null) && $at->lt(Carbon::parse($filters['from'])->startOfDay())) {
            return false;
        }

        return ! (filled($filters['to'] ?? null) && $at->gt(Carbon::parse($filters['to'])->endOfDay()));
    }

    /**
     * @param  Collection<int, AssetAssignment>  $assignments
     */
    private function longestHolding(Collection $assignments): string
    {
        $oldest = $assignments->whereNotNull('assigned_at')->sortBy('assigned_at')->first();

        return $oldest === null ? '—' : (int) $oldest->assigned_at->diffInDays(now()).' days';
    }

    private function turnaroundDays(MaintenanceRequest $request): string
    {
        if ($request->resolved_at === null || $request->created_at === null) {
            return '—';
        }

        return (string) (int) $request->created_at->diffInDays($request->resolved_at);
    }

    /**
     * @param  Collection<int, MaintenanceRequest>  $resolved
     */
    private function averageTurnaround(Collection $resolved): string
    {
        $durations = $resolved
            ->filter(fn (MaintenanceRequest $request): bool => $request->resolved_at !== null && $request->created_at !== null)
            ->map(fn (MaintenanceRequest $request): float => $request->created_at->diffInDays($request->resolved_at));

        return $durations->isEmpty() ? '—' : round($durations->avg(), 1).' days';
    }

    /**
     * Render an amount in pesos for a report cell.
     */
    private function money(string|float|int|null $value): string
    {
        return '₱'.number_format((float) $value, 2);
    }

    /**
     * The departments a viewer may filter by.
     *
     * @return Collection<int, Department>
     */
    public function filterableDepartments(User $viewer): Collection
    {
        return Department::query()
            ->select(['id', 'name'])
            ->when($viewer->isDepartmentScoped(), fn (Builder $query) => $query->where('id', $viewer->department_id))
            ->orderBy('name')
            ->get();
    }
}
