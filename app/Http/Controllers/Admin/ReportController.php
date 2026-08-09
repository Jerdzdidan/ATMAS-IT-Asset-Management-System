<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AssetStatus;
use App\Enums\AuditEvent;
use App\Exports\ReportExport;
use App\Http\Controllers\Controller;
use App\Models\AssetCategory;
use App\Services\AuditLogger;
use App\Services\Reports\ReportBuilder;
use App\Services\Reports\ReportCatalog;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Excel as ExcelFormat;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ReportController extends Controller
{
    public function __construct(
        private readonly ReportBuilder $reports,
        private readonly AuditLogger $auditLogger,
    ) {}

    /**
     * Display the report catalogue, grouped by the question each report answers.
     */
    public function index(): Response
    {
        return Inertia::render('admin/reports/index', [
            'groups' => ReportCatalog::grouped(),
        ]);
    }

    /**
     * Render one report with its headline figures, chart, and paged detail rows.
     */
    public function show(Request $request, string $slug): Response|RedirectResponse
    {
        $key = ReportCatalog::keyFromSlug($slug);

        if ($key === null) {
            return to_route('admin.reports.index');
        }

        $definition = ReportCatalog::definition($key);
        $filters = $this->filters($request, $key);
        $built = $this->reports->build($key, $request->user(), $filters, $this->options($request, $key));

        return Inertia::render('admin/reports/'.$slug, [
            'report' => $definition,
            'title' => $definition['title'],
            'description' => $definition['description'],
            'filters' => $filters,
            'filterOptions' => [
                'departments' => $this->reports->filterableDepartments($request->user()),
                'categories' => AssetCategory::query()->select(['id', 'name'])->orderBy('name')->get(),
                'statuses' => collect(AssetStatus::cases())
                    ->map(fn (AssetStatus $status): array => ['value' => $status->value, 'label' => $status->value])
                    ->all(),
            ],
            'availableFilters' => $definition['filters'],
            'switcher' => ReportCatalog::switcher(),
            'period' => $this->period($filters),
            'kpis' => $built['kpis'],
            'chart' => $built['chart'],
            'columns' => $definition['columns'],
            'rows' => $built['rows'],
        ]);
    }

    /**
     * Download the report as a workbook, a CSV, or a signed-off PDF.
     */
    public function export(Request $request, string $slug): BinaryFileResponse|HttpResponse|RedirectResponse
    {
        $key = ReportCatalog::keyFromSlug($slug);

        if ($key === null) {
            return to_route('admin.reports.index');
        }

        $format = $request->string('format')->toString();
        $definition = ReportCatalog::definition($key);
        $filters = $this->filters($request, $key);
        $built = $this->reports->buildForExport($key, $request->user(), $filters, $this->options($request, $key));

        $this->auditLogger->record(
            AuditEvent::Exported,
            null,
            sprintf('Exported the "%s" report as %s', $definition['title'], strtoupper($format ?: 'xlsx')),
        );

        $filename = sprintf('%s-%s', $slug, now()->format('Y-m-d'));

        if ($format === 'pdf') {
            // Wide tables only fit across the long edge of the page.
            return Pdf::loadView('reports.pdf', [
                'report' => $definition,
                'columns' => $definition['columns'],
                'rows' => $built['rows'],
                'kpis' => $built['kpis'],
                'period' => $this->period($filters),
                'organisation' => config('app.name'),
                'generatedBy' => $request->user()->name,
                'generatedAt' => now(),
                'logo' => $this->brandMarkDataUri(),
            ])->setPaper('a4', 'landscape')->download($filename.'.pdf');
        }

        $export = new ReportExport($definition['title'], $definition['columns'], $built['rows'], $built['kpis']);

        return $format === 'csv'
            ? $export->download($filename.'.csv', ExcelFormat::CSV)
            : $export->download($filename.'.xlsx');
    }

    /**
     * The complete, unpaged result set behind the report, as JSON.
     *
     * Feeds the browser-side PDF builder, which needs every row rather than the page currently
     * on screen. The audit entry records it as a PDF export because that is what the caller is
     * actually producing.
     */
    public function data(Request $request, string $slug): JsonResponse|RedirectResponse
    {
        $key = ReportCatalog::keyFromSlug($slug);

        if ($key === null) {
            return to_route('admin.reports.index');
        }

        $definition = ReportCatalog::definition($key);
        $filters = $this->filters($request, $key);
        $built = $this->reports->buildForExport($key, $request->user(), $filters, $this->options($request, $key));

        $this->auditLogger->record(
            AuditEvent::Exported,
            null,
            sprintf('Exported the "%s" report as PDF', $definition['title']),
        );

        return response()->json([
            'rows' => $built['rows'],
            'kpis' => $built['kpis'],
            'period' => $this->period($filters),
            'generatedBy' => $request->user()->name,
            'generatedAt' => now()->toIso8601String(),
        ]);
    }

    /**
     * The filters the report actually understands, ignoring anything it does not offer.
     *
     * @return array{department_id: int|null, category_id: int|null, status: string|null, from: string|null, to: string|null}
     */
    private function filters(Request $request, string $key): array
    {
        $available = ReportCatalog::filtersFor($key);

        return [
            'department_id' => in_array('department', $available, true) ? ($request->integer('department_id') ?: null) : null,
            'category_id' => in_array('category', $available, true) ? ($request->integer('category_id') ?: null) : null,
            'status' => in_array('status', $available, true) ? ($request->string('status')->toString() ?: null) : null,
            'from' => in_array('dates', $available, true) ? $request->date('from')?->toDateString() : null,
            'to' => in_array('dates', $available, true) ? $request->date('to')?->toDateString() : null,
        ];
    }

    /**
     * Sorting and paging, falling back to the report's natural order.
     *
     * @return array{sort: string|null, direction: string, page: int, per_page: int}
     */
    private function options(Request $request, string $key): array
    {
        $columnKeys = array_column(ReportCatalog::columns($key), 'key');
        $sort = $request->string('sort')->toString();
        $perPage = (int) $request->integer('per_page');

        return [
            'sort' => in_array($sort, $columnKeys, true) ? $sort : null,
            'direction' => $request->string('direction')->toString() === 'asc' ? 'asc' : 'desc',
            'page' => max(1, (int) $request->integer('page', 1)),
            'per_page' => in_array($perPage, [25, 50, 100], true) ? $perPage : 25,
        ];
    }

    /**
     * A human sentence describing the window the figures cover.
     *
     * @param  array<string, mixed>  $filters
     */
    private function period(array $filters): string
    {
        $from = $filters['from'] ?? null;
        $to = $filters['to'] ?? null;

        if ($from === null && $to === null) {
            return 'All records to date';
        }

        $format = fn (?string $date): string => $date === null ? '' : Carbon::parse($date)->format('d M Y');

        return match (true) {
            $from !== null && $to !== null => $format($from).' – '.$format($to),
            $from !== null => 'From '.$format($from),
            default => 'Up to '.$format($to),
        };
    }

    /**
     * The Forms International mark, inlined for the PDF renderer.
     *
     * DomPDF fetches no HTTP assets, so the logo has to travel inside the document itself.
     */
    private function brandMarkDataUri(): string
    {
        $path = public_path('images/forms-international-logo-192.png');

        return is_file($path)
            ? 'data:image/png;base64,'.base64_encode((string) file_get_contents($path))
            : '';
    }
}
