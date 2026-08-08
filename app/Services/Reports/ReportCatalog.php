<?php

namespace App\Services\Reports;

/**
 * The single source of truth for the reporting suite: which reports exist, what question each
 * one answers, how its columns render, and which filters apply.
 *
 * Both the catalogue landing page and the individual report pages read from here, so a report
 * is added in one place rather than three.
 */
class ReportCatalog
{
    public const DEFAULT_REPORT = 'inventory';

    /** Column render hints consumed by the report table, the PDF, and the workbook. */
    public const TYPE_TEXT = 'text';

    public const TYPE_NUMERIC = 'numeric';

    public const TYPE_CURRENCY = 'currency';

    public const TYPE_PERCENT = 'percent';

    public const TYPE_DATE = 'date';

    public const TYPE_DATETIME = 'datetime';

    public const TYPE_STATUS = 'status';

    public const TYPE_CONDITION = 'condition';

    public const TYPE_BADGE = 'badge';

    public const TYPE_NOTES = 'notes';

    /** @var array<string, array{label: string, description: string}> */
    private const CATEGORIES = [
        'inventory' => [
            'label' => 'Inventory',
            'description' => 'What the organisation owns, where it sits, and who is holding it.',
        ],
        'lifecycle' => [
            'label' => 'Lifecycle & maintenance',
            'description' => 'Warranty cover, servicing history, and hardware leaving service.',
        ],
        'finance' => [
            'label' => 'Finance & management',
            'description' => 'Acquisition spend and the portfolio view used for budgeting.',
        ],
        'audit' => [
            'label' => 'Audit & accountability',
            'description' => 'Custody trails and the count sheets an auditor works from.',
        ],
    ];

    /**
     * @var array<string, array{
     *     slug: string,
     *     category: string,
     *     title: string,
     *     answers: string,
     *     description: string,
     *     filters: list<string>,
     *     chart: string|null,
     *     default_sort: array{0: string, 1: string},
     *     columns: list<array{0: string, 1: string, 2?: string}>
     * }>
     *
     * `chart` is null wherever a graph would be decoration. Listings, logbooks, and count sheets
     * are read row by row and acted on individually; only the reports that describe a
     * distribution or a trend over time earn a chart.
     */
    private const REPORTS = [
        'inventory' => [
            'slug' => 'asset-inventory',
            'category' => 'inventory',
            'title' => 'Comprehensive asset inventory',
            'answers' => 'What hardware do we own, and what condition is it in?',
            'description' => 'Every registered asset with its accountability, condition, location, and cost.',
            'filters' => ['department', 'category', 'status'],
            // A register listing is looked up row by row; a category bar chart adds nothing.
            'chart' => null,
            'default_sort' => ['asset_tag', 'asc'],
            'columns' => [
                ['asset_tag', 'Asset tag'],
                ['name', 'Asset'],
                ['category', 'Category'],
                ['department', 'Department'],
                ['brand_model', 'Brand / model'],
                ['serial_number', 'Serial'],
                ['status', 'Status', self::TYPE_STATUS],
                ['condition', 'Condition', self::TYPE_CONDITION],
                ['location', 'Location'],
                ['assigned_to', 'Assigned to'],
                ['purchase_cost', 'Cost', self::TYPE_CURRENCY],
            ],
        ],
        'employee-assets' => [
            'slug' => 'employee-accountability',
            'category' => 'inventory',
            'title' => 'Assets assigned to each employee',
            'answers' => 'Who is currently holding what, and since when?',
            'description' => 'Open custody records with the holder, their department, and how long they have held it.',
            'filters' => ['department'],
            'chart' => null,
            'default_sort' => ['employee', 'asc'],
            'columns' => [
                ['employee', 'Employee'],
                ['employee_code', 'Employee no.'],
                ['department', 'Department'],
                ['asset_tag', 'Asset tag'],
                ['asset', 'Asset'],
                ['category', 'Category'],
                ['assigned_at', 'Issued on', self::TYPE_DATE],
                ['days_held', 'Days held', self::TYPE_NUMERIC],
            ],
        ],
        'department-distribution' => [
            'slug' => 'department-distribution',
            'category' => 'inventory',
            'title' => 'Departmental asset distribution',
            'answers' => 'How is the hardware and its value spread across departments?',
            'description' => 'Counts by status and total acquisition value, rolled up per accountable department.',
            'filters' => [],
            'chart' => 'Assets per department',
            'default_sort' => ['total', 'desc'],
            'columns' => [
                ['department', 'Department'],
                ['code', 'Code'],
                ['total', 'Total', self::TYPE_NUMERIC],
                ['available', 'Available', self::TYPE_NUMERIC],
                ['assigned', 'Assigned', self::TYPE_NUMERIC],
                ['under_repair', 'Under repair', self::TYPE_NUMERIC],
                ['retired', 'Retired', self::TYPE_NUMERIC],
                ['value', 'Acquisition value', self::TYPE_CURRENCY],
            ],
        ],
        'warranty' => [
            'slug' => 'warranty-expiration',
            'category' => 'lifecycle',
            'title' => 'Warranty expiration overview',
            'answers' => 'What is still under warranty, expiring soon, or already lapsed?',
            'description' => 'Assets carrying a warranty date, ordered by how soon cover runs out.',
            'filters' => ['department', 'category'],
            'chart' => 'Warranty cover by time remaining',
            'default_sort' => ['warranty_expires_at', 'asc'],
            'columns' => [
                ['asset_tag', 'Asset tag'],
                ['name', 'Asset'],
                ['department', 'Department'],
                ['purchase_date', 'Purchased', self::TYPE_DATE],
                ['warranty_expires_at', 'Warranty ends', self::TYPE_DATE],
                ['days_remaining', 'Days left', self::TYPE_NUMERIC],
                ['state', 'State', self::TYPE_BADGE],
            ],
        ],
        'maintenance-history' => [
            'slug' => 'maintenance-history',
            'category' => 'lifecycle',
            'title' => 'Maintenance and repair history',
            'answers' => 'What broke, who fixed it, and how long did it take?',
            'description' => 'Every repair and preventive service logged against the register, with turnaround time.',
            'filters' => ['department', 'dates'],
            'chart' => 'Tickets logged by month',
            'default_sort' => ['logged_at', 'desc'],
            'columns' => [
                ['logged_at', 'Logged', self::TYPE_DATE],
                ['asset_tag', 'Asset tag'],
                ['asset', 'Asset'],
                ['department', 'Department'],
                ['request_type', 'Type', self::TYPE_BADGE],
                ['issue_description', 'Issue', self::TYPE_NOTES],
                ['status', 'Status', self::TYPE_BADGE],
                ['handled_by', 'Handled by'],
                ['turnaround', 'Days to resolve', self::TYPE_NUMERIC],
            ],
        ],
        'damaged-retired' => [
            'slug' => 'damaged-and-retired',
            'category' => 'lifecycle',
            'title' => 'Damaged and retired assets',
            'answers' => 'What has left service, and what value did it carry?',
            'description' => 'Hardware retired, under repair, or recorded in poor condition.',
            'filters' => ['department', 'category'],
            'chart' => null,
            'default_sort' => ['asset_tag', 'asc'],
            'columns' => [
                ['asset_tag', 'Asset tag'],
                ['name', 'Asset'],
                ['category', 'Category'],
                ['department', 'Department'],
                ['status', 'Status', self::TYPE_STATUS],
                ['condition', 'Condition', self::TYPE_CONDITION],
                ['purchase_date', 'Purchased', self::TYPE_DATE],
                ['purchase_cost', 'Cost', self::TYPE_CURRENCY],
                ['remarks', 'Remarks', self::TYPE_NOTES],
            ],
        ],
        'acquisitions' => [
            'slug' => 'acquisitions',
            'category' => 'finance',
            'title' => 'New asset acquisition overview',
            'answers' => 'What did we buy in this period, and what did it cost?',
            'description' => 'Purchases in the selected window with unit cost and total spend.',
            'filters' => ['department', 'category', 'dates'],
            'chart' => 'Acquisition spend by month',
            'default_sort' => ['purchase_date', 'desc'],
            'columns' => [
                ['purchase_date', 'Purchased', self::TYPE_DATE],
                ['asset_tag', 'Asset tag'],
                ['name', 'Asset'],
                ['category', 'Category'],
                ['department', 'Department'],
                ['brand_model', 'Brand / model'],
                ['condition', 'Condition', self::TYPE_CONDITION],
                ['purchase_cost', 'Cost', self::TYPE_CURRENCY],
            ],
        ],
        'management-summary' => [
            'slug' => 'management-summary',
            'category' => 'finance',
            'title' => 'Management summary',
            'answers' => 'How is the portfolio performing, department by department?',
            'description' => 'Utilisation, value, open tickets, and overdue servicing rolled up for budget decisions.',
            'filters' => [],
            'chart' => 'Acquisition value by department',
            'default_sort' => ['assets', 'desc'],
            'columns' => [
                ['department', 'Department'],
                ['assets', 'Assets', self::TYPE_NUMERIC],
                ['in_service', 'In service', self::TYPE_NUMERIC],
                ['utilisation', 'Utilisation', self::TYPE_PERCENT],
                ['value', 'Acquisition value', self::TYPE_CURRENCY],
                ['open_tickets', 'Open tickets', self::TYPE_NUMERIC],
                ['overdue_maintenance', 'Overdue PM', self::TYPE_NUMERIC],
            ],
        ],
        'movement' => [
            'slug' => 'asset-movement',
            'category' => 'audit',
            'title' => 'Asset movement and transfers',
            'answers' => 'Where has each asset been, and who signed for it?',
            'description' => 'Issue and return handovers unrolled into one dated logbook.',
            'filters' => ['department', 'dates'],
            'chart' => null,
            'default_sort' => ['date', 'desc'],
            'columns' => [
                ['date', 'Date', self::TYPE_DATETIME],
                ['movement', 'Movement', self::TYPE_BADGE],
                ['asset_tag', 'Asset tag'],
                ['asset', 'Asset'],
                ['department', 'Department'],
                ['employee', 'Employee'],
                ['processed_by', 'Processed by'],
                ['notes', 'Notes', self::TYPE_NOTES],
            ],
        ],
        'audit-inventory' => [
            'slug' => 'audit-inventory',
            'category' => 'audit',
            'title' => 'Audit inventory overview',
            'answers' => 'What should a physical count find, and when was each item last touched?',
            'description' => 'Count sheet with accountability and last recorded activity, plus a column to tick off in the field.',
            'filters' => ['department', 'category'],
            'chart' => null,
            'default_sort' => ['asset_tag', 'asc'],
            'columns' => [
                ['asset_tag', 'Asset tag'],
                ['name', 'Asset'],
                ['category', 'Category'],
                ['department', 'Department'],
                ['serial_number', 'Serial'],
                ['status', 'Status', self::TYPE_STATUS],
                ['accountable', 'Accountable'],
                ['last_activity', 'Last activity', self::TYPE_DATE],
                ['last_actor', 'By'],
                ['verified', 'Physically verified'],
            ],
        ],
    ];

    /** @return list<string> */
    public static function keys(): array
    {
        return array_keys(self::REPORTS);
    }

    /** @return list<string> */
    public static function slugs(): array
    {
        return array_column(self::REPORTS, 'slug');
    }

    public static function exists(string $key): bool
    {
        return array_key_exists($key, self::REPORTS);
    }

    public static function keyFromSlug(string $slug): ?string
    {
        foreach (self::REPORTS as $key => $report) {
            if ($report['slug'] === $slug) {
                return $key;
            }
        }

        return null;
    }

    public static function slugFromKey(string $key): string
    {
        return self::REPORTS[$key]['slug'] ?? self::REPORTS[self::DEFAULT_REPORT]['slug'];
    }

    /**
     * Full definition for one report, with columns expanded into render-ready shape.
     *
     * @return array<string, mixed>
     */
    public static function definition(string $key): array
    {
        $report = self::REPORTS[$key] ?? self::REPORTS[self::DEFAULT_REPORT];

        return [
            'key' => $key,
            'slug' => $report['slug'],
            'url' => '/admin/reports/'.$report['slug'],
            'category' => $report['category'],
            'category_label' => self::CATEGORIES[$report['category']]['label'],
            'title' => $report['title'],
            'answers' => $report['answers'],
            'description' => $report['description'],
            'filters' => $report['filters'],
            'chart_label' => $report['chart'],
            'columns' => self::columns($key),
            'default_sort' => ['key' => $report['default_sort'][0], 'direction' => $report['default_sort'][1]],
        ];
    }

    /** @return list<array{key: string, label: string, type: string}> */
    public static function columns(string $key): array
    {
        $report = self::REPORTS[$key] ?? self::REPORTS[self::DEFAULT_REPORT];

        return array_map(fn (array $column): array => [
            'key' => $column[0],
            'label' => $column[1],
            'type' => $column[2] ?? self::TYPE_TEXT,
        ], $report['columns']);
    }

    /** @return list<string> */
    public static function filtersFor(string $key): array
    {
        return (self::REPORTS[$key] ?? self::REPORTS[self::DEFAULT_REPORT])['filters'];
    }

    /** @return array{key: string, direction: string} */
    public static function defaultSort(string $key): array
    {
        $sort = (self::REPORTS[$key] ?? self::REPORTS[self::DEFAULT_REPORT])['default_sort'];

        return ['key' => $sort[0], 'direction' => $sort[1]];
    }

    /**
     * The catalogue shown on the reports landing page, grouped by category.
     *
     * @return list<array{key: string, label: string, description: string, reports: list<array<string, mixed>>}>
     */
    public static function grouped(): array
    {
        $groups = [];

        foreach (self::CATEGORIES as $categoryKey => $category) {
            $reports = [];

            foreach (self::REPORTS as $reportKey => $report) {
                if ($report['category'] !== $categoryKey) {
                    continue;
                }

                $reports[] = [
                    'key' => $reportKey,
                    'slug' => $report['slug'],
                    'url' => '/admin/reports/'.$report['slug'],
                    'title' => $report['title'],
                    'answers' => $report['answers'],
                    'description' => $report['description'],
                    'columns' => array_slice(array_column(self::columns($reportKey), 'label'), 0, 5),
                ];
            }

            $groups[] = [
                'key' => $categoryKey,
                'label' => $category['label'],
                'description' => $category['description'],
                'reports' => $reports,
            ];
        }

        return $groups;
    }

    /**
     * Flat list used by the in-page report switcher.
     *
     * @return list<array{key: string, slug: string, url: string, title: string, category_label: string}>
     */
    public static function switcher(): array
    {
        $reports = [];

        foreach (self::REPORTS as $key => $report) {
            $reports[] = [
                'key' => $key,
                'slug' => $report['slug'],
                'url' => '/admin/reports/'.$report['slug'],
                'title' => $report['title'],
                'category_label' => self::CATEGORIES[$report['category']]['label'],
            ];
        }

        return $reports;
    }
}
