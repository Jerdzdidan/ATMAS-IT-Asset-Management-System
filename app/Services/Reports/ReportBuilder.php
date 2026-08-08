<?php

namespace App\Services\Reports;

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
 * Produces the rows, headline figures, and chart series behind every report in the catalogue.
 *
 * Cells are returned as raw scalars rather than formatted strings: the table, the workbook, and
 * the PDF each format for their own medium, and sorting a currency column only behaves when the
 * value underneath is still a number.
 */
class ReportBuilder
{
    /**
     * Days ahead that still count as "expiring soon" for warranty reporting.
     */
    private const WARRANTY_HORIZON_DAYS = 90;

    /**
     * Bars shown on a ranking chart before the tail is dropped.
     */
    private const RANKING_LIMIT = 8;

    /**
     * Build one report, then sort and page the rows the operator asked for.
     *
     * @param  array<string, mixed>  $filters
     * @param  array{sort?: string|null, direction?: string|null, page?: int, per_page?: int}  $options
     * @return array{kpis: list<array{label: string, value: string|int|float, hint?: string}>, chart: array{label: string, kind: string, data: list<array{label: string, value: float|int}>}, rows: array<string, mixed>}
     */
    public function build(string $key, User $viewer, array $filters = [], array $options = []): array
    {
        $payload = match ($key) {
            'inventory' => $this->inventory($viewer, $filters),
            'employee-assets' => $this->employeeAssets($viewer, $filters),
            'department-distribution' => $this->departmentDistribution($viewer),
            'warranty' => $this->warranty($viewer, $filters),
            'maintenance-history' => $this->maintenanceHistory($viewer, $filters),
            'damaged-retired' => $this->damagedAndRetired($viewer, $filters),
            'acquisitions' => $this->acquisitions($viewer, $filters),
            'management-summary' => $this->managementSummary($viewer),
            'movement' => $this->movement($viewer, $filters),
            'audit-inventory' => $this->auditInventory($viewer, $filters),
            default => $this->inventory($viewer, $filters),
        };

        $sorted = $this->sort($payload['rows'], $options, ReportCatalog::defaultSort($key));

        return [
            'kpis' => $payload['kpis'],
            'chart' => ['label' => ReportCatalog::definition($key)['chart_label'], ...$payload['chart']],
            'rows' => $this->paginate($sorted, $options),
        ];
    }

    /**
     * Every row of a report, unpaged, for the workbook and PDF exporters.
     *
     * @param  array<string, mixed>  $filters
     * @param  array{sort?: string|null, direction?: string|null}  $options
     * @return array{kpis: list<array{label: string, value: string|int|float}>, rows: list<array<string, mixed>>}
     */
    public function buildForExport(string $key, User $viewer, array $filters = [], array $options = []): array
    {
        $built = $this->build($key, $viewer, $filters, [...$options, 'page' => 1, 'per_page' => PHP_INT_MAX]);

        return ['kpis' => $built['kpis'], 'rows' => $built['rows']['data']];
    }

    /**
     * Comprehensive asset inventory.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function inventory(User $viewer, array $filters): array
    {
        $assets = $this->assetQuery($viewer, $filters)
            ->with(['category:id,name', 'department:id,name', 'currentAssignment.user:id,name'])
            ->get();

        return [
            'rows' => $assets->map(fn (Asset $asset): array => [
                'asset_tag' => $asset->asset_tag,
                'name' => $asset->name,
                'category' => $asset->category?->name,
                'department' => $asset->department?->name,
                'brand_model' => trim($asset->brand.' '.$asset->model) ?: null,
                'serial_number' => $asset->serial_number,
                'status' => $asset->status->value,
                'condition' => $asset->condition->value,
                'location' => $asset->location,
                'assigned_to' => $asset->currentAssignment?->user?->name,
                'purchase_cost' => (float) $asset->purchase_cost,
            ])->all(),
            'kpis' => [
                ['label' => 'Assets listed', 'value' => $assets->count()],
                ['label' => 'Acquisition value', 'value' => $this->money($assets->sum(fn (Asset $a): float => (float) $a->purchase_cost))],
                ['label' => 'In custody', 'value' => $assets->where('status', AssetStatus::Assigned)->count(), 'hint' => 'Assets currently issued to an employee.'],
                ['label' => 'Available', 'value' => $assets->where('status', AssetStatus::Available)->count(), 'hint' => 'Sitting in store and ready to issue.'],
                ['label' => 'Out of service', 'value' => $assets->whereIn('status', [AssetStatus::UnderRepair, AssetStatus::Retired])->count()],
            ],
            'chart' => $this->ranking($assets->groupBy(fn (Asset $a): string => $a->category?->name ?? 'Uncategorised')->map(fn (Collection $group): int => $group->count())),
        ];
    }

    /**
     * Assets assigned to each employee.
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
                fn (Builder $query, int $id) => $query->whereHas('asset', fn (Builder $asset) => $asset->where('department_id', $id)),
            )
            ->get();

        return [
            'rows' => $assignments->map(fn (AssetAssignment $a): array => [
                'employee' => $a->user?->name,
                'employee_code' => $a->user?->employee_code,
                'department' => $a->user?->department?->name,
                'asset_tag' => $a->asset?->asset_tag,
                'asset' => $a->asset?->name,
                'category' => $a->asset?->category?->name,
                'assigned_at' => $a->assigned_at?->toDateString(),
                'days_held' => $a->assigned_at === null ? null : (int) $a->assigned_at->diffInDays(now()),
            ])->all(),
            'kpis' => [
                ['label' => 'Assets in custody', 'value' => $assignments->count()],
                ['label' => 'Employees holding', 'value' => $assignments->pluck('user_id')->unique()->count()],
                ['label' => 'Longest holding', 'value' => $this->longestHolding($assignments), 'hint' => 'The oldest open custody record still outstanding.'],
                ['label' => 'Average held', 'value' => $this->averageHolding($assignments)],
            ],
            'chart' => $this->ranking(
                $assignments->groupBy(fn (AssetAssignment $a): string => $a->user?->department?->name ?? 'Unassigned')->map(fn (Collection $group): int => $group->count()),
            ),
        ];
    }

    /**
     * Departmental asset distribution.
     *
     * @return array<string, mixed>
     */
    private function departmentDistribution(User $viewer): array
    {
        $assets = Asset::query()->visibleTo($viewer)->with('department:id,name,code')->get();

        $rows = $assets
            ->groupBy(fn (Asset $a): string => $a->department?->name ?? 'Unassigned')
            ->map(fn (Collection $group, string $department): array => [
                'department' => $department,
                'code' => $group->first()->department?->code,
                'total' => $group->count(),
                'available' => $group->where('status', AssetStatus::Available)->count(),
                'assigned' => $group->where('status', AssetStatus::Assigned)->count(),
                'under_repair' => $group->where('status', AssetStatus::UnderRepair)->count(),
                'retired' => $group->where('status', AssetStatus::Retired)->count(),
                'value' => (float) $group->sum(fn (Asset $a): float => (float) $a->purchase_cost),
            ])
            ->values()
            ->all();

        return [
            'rows' => $rows,
            'kpis' => [
                ['label' => 'Departments holding', 'value' => count($rows)],
                ['label' => 'Assets registered', 'value' => $assets->count()],
                ['label' => 'Without a department', 'value' => $assets->whereNull('department_id')->count(), 'hint' => 'Assets nobody is accountable for. These should be assigned an owner.'],
                ['label' => 'Total value', 'value' => $this->money($assets->sum(fn (Asset $a): float => (float) $a->purchase_cost))],
            ],
            'chart' => $this->ranking(collect($rows)->pluck('total', 'department')),
        ];
    }

    /**
     * Warranty expiration overview.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function warranty(User $viewer, array $filters): array
    {
        $assets = $this->assetQuery($viewer, $filters)
            ->with('department:id,name')
            ->whereNotNull('warranty_expires_at')
            ->get();

        $today = now()->startOfDay();
        $horizon = $today->copy()->addDays(self::WARRANTY_HORIZON_DAYS);

        return [
            'rows' => $assets->map(function (Asset $asset) use ($today): array {
                $daysRemaining = (int) $today->diffInDays($asset->warranty_expires_at, false);

                return [
                    'asset_tag' => $asset->asset_tag,
                    'name' => $asset->name,
                    'department' => $asset->department?->name,
                    'purchase_date' => $asset->purchase_date?->toDateString(),
                    'warranty_expires_at' => $asset->warranty_expires_at->toDateString(),
                    'days_remaining' => $daysRemaining,
                    'state' => match (true) {
                        $daysRemaining < 0 => 'Expired',
                        $daysRemaining <= self::WARRANTY_HORIZON_DAYS => 'Expiring soon',
                        default => 'Covered',
                    },
                ];
            })->all(),
            'kpis' => [
                ['label' => 'Expired', 'value' => $assets->filter(fn (Asset $a): bool => $a->warranty_expires_at->lt($today))->count()],
                ['label' => 'Expiring in '.self::WARRANTY_HORIZON_DAYS.' days', 'value' => $assets->filter(
                    fn (Asset $a): bool => $a->warranty_expires_at->gte($today) && $a->warranty_expires_at->lte($horizon),
                )->count(), 'hint' => 'Renew or budget for replacement before cover lapses.'],
                ['label' => 'Still covered', 'value' => $assets->filter(fn (Asset $a): bool => $a->warranty_expires_at->gt($horizon))->count()],
                ['label' => 'No warranty recorded', 'value' => $this->assetQuery($viewer, $filters)->whereNull('warranty_expires_at')->count()],
            ],
            'chart' => $this->timeseries(
                $assets->groupBy(fn (Asset $a): string => $a->warranty_expires_at->format('Y-m'))->map(fn (Collection $group): int => $group->count()),
            ),
        ];
    }

    /**
     * Maintenance and repair history.
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
                fn (Builder $query, int $id) => $query->whereHas('asset', fn (Builder $asset) => $asset->where('department_id', $id)),
            )
            ->when($filters['from'] ?? null, fn (Builder $query, string $from) => $query->whereDate('created_at', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $query, string $to) => $query->whereDate('created_at', '<=', $to))
            ->get();

        $resolved = $requests->where('status', MaintenanceRequestStatus::Resolved);

        return [
            'rows' => $requests->map(fn (MaintenanceRequest $r): array => [
                'logged_at' => $r->created_at?->toDateString(),
                'asset_tag' => $r->asset?->asset_tag,
                'asset' => $r->asset?->name,
                'department' => $r->asset?->department?->name,
                'request_type' => $r->request_type->value,
                'issue_description' => $r->issue_description,
                'status' => $r->status->value,
                'handled_by' => $r->handledBy?->name,
                'turnaround' => $this->turnaroundDays($r),
            ])->all(),
            'kpis' => [
                ['label' => 'Tickets logged', 'value' => $requests->count()],
                ['label' => 'Resolved', 'value' => $resolved->count()],
                ['label' => 'Still open', 'value' => $requests->whereIn('status', [MaintenanceRequestStatus::Pending, MaintenanceRequestStatus::InProgress])->count()],
                ['label' => 'Average turnaround', 'value' => $this->averageTurnaround($resolved), 'hint' => 'Mean days between a ticket being logged and resolved.'],
                ['label' => 'Preventive share', 'value' => $this->preventiveShare($requests), 'hint' => 'Proportion of work that was scheduled rather than reactive.'],
            ],
            'chart' => $this->timeseries(
                $requests->filter(fn (MaintenanceRequest $r): bool => $r->created_at !== null)
                    ->groupBy(fn (MaintenanceRequest $r): string => $r->created_at->format('Y-m'))
                    ->map(fn (Collection $group): int => $group->count()),
            ),
        ];
    }

    /**
     * Damaged and retired assets.
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
            ->get();

        return [
            'rows' => $assets->map(fn (Asset $a): array => [
                'asset_tag' => $a->asset_tag,
                'name' => $a->name,
                'category' => $a->category?->name,
                'department' => $a->department?->name,
                'status' => $a->status->value,
                'condition' => $a->condition->value,
                'purchase_date' => $a->purchase_date?->toDateString(),
                'purchase_cost' => (float) $a->purchase_cost,
                'remarks' => $a->remarks,
            ])->all(),
            'kpis' => [
                ['label' => 'Retired', 'value' => $assets->where('status', AssetStatus::Retired)->count()],
                ['label' => 'Under repair', 'value' => $assets->where('status', AssetStatus::UnderRepair)->count()],
                ['label' => 'Poor condition', 'value' => $assets->where('condition', AssetCondition::Poor)->count(), 'hint' => 'Still in service but flagged as needing replacement.'],
                ['label' => 'Value affected', 'value' => $this->money($assets->sum(fn (Asset $a): float => (float) $a->purchase_cost))],
            ],
            'chart' => $this->ranking($assets->groupBy(fn (Asset $a): string => $a->category?->name ?? 'Uncategorised')->map(fn (Collection $group): int => $group->count())),
        ];
    }

    /**
     * New asset acquisition overview.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function acquisitions(User $viewer, array $filters): array
    {
        $assets = $this->assetQuery($viewer, $filters)
            ->with(['category:id,name', 'department:id,name'])
            ->whereNotNull('purchase_date')
            ->when($filters['from'] ?? null, fn (Builder $q, string $from) => $q->whereDate('purchase_date', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $q, string $to) => $q->whereDate('purchase_date', '<=', $to))
            ->get();

        $spend = $assets->sum(fn (Asset $a): float => (float) $a->purchase_cost);

        return [
            'rows' => $assets->map(fn (Asset $a): array => [
                'purchase_date' => $a->purchase_date->toDateString(),
                'asset_tag' => $a->asset_tag,
                'name' => $a->name,
                'category' => $a->category?->name,
                'department' => $a->department?->name,
                'brand_model' => trim($a->brand.' '.$a->model) ?: null,
                'condition' => $a->condition->value,
                'purchase_cost' => (float) $a->purchase_cost,
            ])->all(),
            'kpis' => [
                ['label' => 'Units acquired', 'value' => $assets->count()],
                ['label' => 'Total spend', 'value' => $this->money($spend)],
                ['label' => 'Average unit cost', 'value' => $this->money($assets->count() === 0 ? 0 : $spend / $assets->count())],
                ['label' => 'Categories covered', 'value' => $assets->pluck('asset_category_id')->unique()->count()],
            ],
            'chart' => $this->timeseries(
                $assets->groupBy(fn (Asset $a): string => $a->purchase_date->format('Y-m'))
                    ->map(fn (Collection $group): float => round($group->sum(fn (Asset $a): float => (float) $a->purchase_cost), 2)),
                'currency',
            ),
        ];
    }

    /**
     * Management summary.
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
            ->groupBy(fn (Asset $a): string => $a->department?->name ?? 'Unassigned')
            ->map(function (Collection $group, string $department) use ($openTickets, $overduePlans): array {
                $departmentId = $group->first()->department_id;
                $inService = $group->whereNotIn('status', [AssetStatus::Retired])->count();

                return [
                    'department' => $department,
                    'assets' => $group->count(),
                    'in_service' => $inService,
                    'utilisation' => $inService === 0 ? 0.0 : round($group->where('status', AssetStatus::Assigned)->count() / $inService * 100, 1),
                    'value' => (float) $group->sum(fn (Asset $a): float => (float) $a->purchase_cost),
                    'open_tickets' => $openTickets->filter(fn (MaintenanceRequest $t): bool => $t->asset?->department_id === $departmentId)->count(),
                    'overdue_maintenance' => $overduePlans->filter(fn (MaintenanceSchedule $p): bool => $p->asset?->department_id === $departmentId)->count(),
                ];
            })
            ->values()
            ->all();

        $inService = $assets->whereNotIn('status', [AssetStatus::Retired])->count();

        return [
            'rows' => $rows,
            'kpis' => [
                ['label' => 'Portfolio value', 'value' => $this->money($assets->sum(fn (Asset $a): float => (float) $a->purchase_cost))],
                ['label' => 'Assets in service', 'value' => $inService.' of '.$assets->count()],
                ['label' => 'Utilisation', 'value' => ($inService === 0 ? 0 : round($assets->where('status', AssetStatus::Assigned)->count() / $inService * 100)).'%', 'hint' => 'Share of in-service assets currently issued to an employee.'],
                ['label' => 'Open tickets', 'value' => $openTickets->count()],
                ['label' => 'Overdue maintenance', 'value' => $overduePlans->count(), 'hint' => 'Preventive plans past their scheduled service date.'],
            ],
            'chart' => $this->ranking(collect($rows)->pluck('value', 'department'), 'currency'),
        ];
    }

    /**
     * Asset movement and transfers.
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
                fn (Builder $query, int $id) => $query->whereHas('asset', fn (Builder $asset) => $asset->where('department_id', $id)),
            )
            ->get();

        $movements = collect();

        foreach ($assignments as $assignment) {
            $movements->push($this->movementRow($assignment, 'Issued', $assignment->assigned_at, $assignment->assignedBy?->name, $assignment->notes));

            if ($assignment->returned_at !== null) {
                $movements->push($this->movementRow($assignment, 'Returned', $assignment->returned_at, $assignment->returnedBy?->name, $assignment->return_notes));
            }
        }

        $movements = $movements->filter(fn (array $row): bool => $this->withinRange($row['sort'], $filters))->values();

        return [
            'rows' => $movements->map(fn (array $row): array => collect($row)->except('sort')->all())->all(),
            'kpis' => [
                ['label' => 'Movements recorded', 'value' => $movements->count()],
                ['label' => 'Issues', 'value' => $movements->where('movement', 'Issued')->count()],
                ['label' => 'Returns', 'value' => $movements->where('movement', 'Returned')->count()],
                ['label' => 'Still out', 'value' => $assignments->whereNull('returned_at')->count(), 'hint' => 'Custody records with no return logged against them.'],
            ],
            'chart' => $this->timeseries(
                $movements->groupBy(fn (array $row): string => Carbon::parse($row['date'])->format('Y-m'))->map(fn (Collection $group): int => $group->count()),
            ),
        ];
    }

    /**
     * Audit inventory overview.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function auditInventory(User $viewer, array $filters): array
    {
        $assets = $this->assetQuery($viewer, $filters)
            ->with(['category:id,name', 'department:id,name', 'currentAssignment.user:id,name'])
            ->get();

        $lastTouched = ActivityLog::query()
            ->where('subject_type', 'Asset')
            ->whereIn('subject_id', $assets->pluck('id'))
            ->orderByDesc('id')
            ->get(['subject_id', 'actor_name', 'created_at'])
            ->unique('subject_id')
            ->keyBy('subject_id');

        return [
            'rows' => $assets->map(fn (Asset $a): array => [
                'asset_tag' => $a->asset_tag,
                'name' => $a->name,
                'category' => $a->category?->name,
                'department' => $a->department?->name,
                'serial_number' => $a->serial_number ?? 'NOT RECORDED',
                'status' => $a->status->value,
                'accountable' => $a->currentAssignment?->user?->name ?? 'Store',
                'last_activity' => $lastTouched->get($a->id)?->created_at?->toDateString(),
                'last_actor' => $lastTouched->get($a->id)?->actor_name,
                // Left blank on purpose: the auditor ticks this column on the printed sheet.
                'verified' => '',
            ])->all(),
            'kpis' => [
                ['label' => 'Assets to count', 'value' => $assets->count()],
                ['label' => 'Missing a serial', 'value' => $assets->whereNull('serial_number')->count(), 'hint' => 'Cannot be uniquely identified during a physical count.'],
                ['label' => 'Missing a department', 'value' => $assets->whereNull('department_id')->count()],
                ['label' => 'No recorded activity', 'value' => $assets->filter(fn (Asset $a): bool => ! $lastTouched->has($a->id))->count()],
            ],
            'chart' => $this->ranking($assets->groupBy(fn (Asset $a): string => $a->department?->name ?? 'Unassigned')->map(fn (Collection $group): int => $group->count())),
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
            ->when($filters['department_id'] ?? null, fn (Builder $q, int $id) => $q->where('department_id', $id))
            ->when($filters['category_id'] ?? null, fn (Builder $q, int $id) => $q->where('asset_category_id', $id))
            ->when($filters['status'] ?? null, fn (Builder $q, string $status) => $q->where('status', $status));
    }

    /**
     * Order the rows by the requested column, falling back to the report's natural order.
     *
     * @param  list<array<string, mixed>>  $rows
     * @param  array{sort?: string|null, direction?: string|null}  $options
     * @param  array{key: string, direction: string}  $default
     * @return list<array<string, mixed>>
     */
    private function sort(array $rows, array $options, array $default): array
    {
        $key = $options['sort'] ?? $default['key'];
        $descending = ($options['direction'] ?? $default['direction']) === 'desc';

        if ($rows === [] || ! array_key_exists($key, $rows[0])) {
            return $rows;
        }

        usort($rows, function (array $left, array $right) use ($key): int {
            $a = $left[$key];
            $b = $right[$key];

            if (is_numeric($a) && is_numeric($b)) {
                return $a <=> $b;
            }

            // Nulls always sink, whichever way the column is sorted.
            return strcasecmp((string) ($a ?? ''), (string) ($b ?? ''));
        });

        return $descending ? array_reverse($rows) : $rows;
    }

    /**
     * Slice the rows into the page shape the table component expects.
     *
     * @param  list<array<string, mixed>>  $rows
     * @param  array{page?: int, per_page?: int}  $options
     * @return array<string, mixed>
     */
    private function paginate(array $rows, array $options): array
    {
        $total = count($rows);
        $perPage = max(1, (int) ($options['per_page'] ?? 25));
        $lastPage = max(1, (int) ceil($total / $perPage));
        $page = min(max(1, (int) ($options['page'] ?? 1)), $lastPage);
        $slice = array_slice($rows, ($page - 1) * $perPage, $perPage);

        return [
            'data' => $slice,
            'current_page' => $page,
            'last_page' => $lastPage,
            'total' => $total,
            'from' => $total === 0 ? null : (($page - 1) * $perPage) + 1,
            'to' => $total === 0 ? null : (($page - 1) * $perPage) + count($slice),
        ];
    }

    /**
     * A bar per month, oldest first, with the label already sortable.
     *
     * @param  Collection<string, int|float>  $series
     * @return array{kind: string, format: string, data: list<array{label: string, value: float|int}>}
     */
    private function timeseries(Collection $series, string $format = 'number'): array
    {
        return [
            'kind' => 'timeseries',
            'format' => $format,
            'data' => $series->sortKeys()
                ->map(fn ($value, string $month): array => ['label' => $month, 'value' => $value])
                ->values()
                ->all(),
        ];
    }

    /**
     * The strongest few categories, biggest first.
     *
     * @param  Collection<string, int|float>  $series
     * @return array{kind: string, format: string, data: list<array{label: string, value: float|int}>}
     */
    private function ranking(Collection $series, string $format = 'number'): array
    {
        return [
            'kind' => 'ranking',
            'format' => $format,
            'data' => $series->sortDesc()
                ->take(self::RANKING_LIMIT)
                ->map(fn ($value, string $label): array => ['label' => $label, 'value' => $value])
                ->values()
                ->all(),
        ];
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
            'date' => $at?->toDateTimeString(),
            'movement' => $movement,
            'asset_tag' => $assignment->asset?->asset_tag,
            'asset' => $assignment->asset?->name,
            'department' => $assignment->asset?->department?->name,
            'employee' => $assignment->user?->name,
            'processed_by' => $processedBy,
            'notes' => $notes,
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

    /**
     * @param  Collection<int, AssetAssignment>  $assignments
     */
    private function averageHolding(Collection $assignments): string
    {
        $days = $assignments->whereNotNull('assigned_at')->map(fn (AssetAssignment $a): float => $a->assigned_at->diffInDays(now()));

        return $days->isEmpty() ? '—' : round($days->avg()).' days';
    }

    private function turnaroundDays(MaintenanceRequest $request): ?int
    {
        return $request->resolved_at === null || $request->created_at === null
            ? null
            : (int) $request->created_at->diffInDays($request->resolved_at);
    }

    /**
     * @param  Collection<int, MaintenanceRequest>  $resolved
     */
    private function averageTurnaround(Collection $resolved): string
    {
        $durations = $resolved
            ->filter(fn (MaintenanceRequest $r): bool => $r->resolved_at !== null && $r->created_at !== null)
            ->map(fn (MaintenanceRequest $r): float => $r->created_at->diffInDays($r->resolved_at));

        return $durations->isEmpty() ? '—' : round($durations->avg(), 1).' days';
    }

    /**
     * @param  Collection<int, MaintenanceRequest>  $requests
     */
    private function preventiveShare(Collection $requests): string
    {
        if ($requests->isEmpty()) {
            return '—';
        }

        $preventive = $requests->filter(fn (MaintenanceRequest $r): bool => $r->request_type->value === 'PREVENTIVE')->count();

        return round($preventive / $requests->count() * 100).'%';
    }

    private function money(float|int $value): string
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
