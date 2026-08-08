<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AssetStatus;
use App\Enums\AuditEvent;
use App\Exports\ReportExport;
use App\Http\Controllers\Controller;
use App\Models\AssetCategory;
use App\Services\AuditLogger;
use App\Services\ReportBuilder;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ReportController extends Controller
{
    public function __construct(
        private readonly ReportBuilder $reports,
        private readonly AuditLogger $auditLogger,
    ) {}

    /**
     * Display the report console with the selected report already rendered.
     */
    public function index(Request $request): Response
    {
        $key = $this->resolveKey($request);
        $filters = $this->filters($request);

        return Inertia::render('admin/reports', [
            'definitions' => collect($this->reports->definitions())
                ->map(fn (array $definition, string $definitionKey): array => ['key' => $definitionKey, ...$definition])
                ->values()
                ->all(),
            'report' => $this->reports->build($key, $request->user(), $filters),
            'selected' => $key,
            'filters' => $filters,
            'departments' => $this->reports->filterableDepartments($request->user()),
            'categories' => AssetCategory::query()->select(['id', 'name'])->orderBy('name')->get(),
            'statuses' => collect(AssetStatus::cases())
                ->map(fn (AssetStatus $status): array => ['value' => $status->value, 'label' => $status->value])
                ->all(),
            'generatedAt' => now()->toIso8601String(),
        ]);
    }

    /**
     * Download the selected report as an Excel workbook.
     */
    public function excel(Request $request): BinaryFileResponse
    {
        $key = $this->resolveKey($request);
        $report = $this->reports->build($key, $request->user(), $this->filters($request));

        $this->auditLogger->record(AuditEvent::Exported, null, "Exported the \"{$report['title']}\" report to Excel");

        return (new ReportExport($report))->download(sprintf('%s-%s.xlsx', $key, now()->format('Y-m-d')));
    }

    /**
     * Download the selected report as a signed-off PDF.
     */
    public function pdf(Request $request): HttpResponse
    {
        $key = $this->resolveKey($request);
        $report = $this->reports->build($key, $request->user(), $this->filters($request));

        $this->auditLogger->record(AuditEvent::Exported, null, "Exported the \"{$report['title']}\" report to PDF");

        // Wide tables only fit across the long edge of the page.
        return Pdf::loadView('reports.pdf', [
            'report' => $report,
            'organisation' => config('app.name'),
            'generatedBy' => $request->user()->name,
            'generatedAt' => now(),
            'logo' => $this->brandMarkDataUri(),
        ])->setPaper('a4', 'landscape')->download(sprintf('%s-%s.pdf', $key, now()->format('Y-m-d')));
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

    /**
     * The report requested, falling back to the inventory sheet.
     */
    private function resolveKey(Request $request): string
    {
        $key = $request->string('report')->toString();

        return array_key_exists($key, $this->reports->definitions()) ? $key : 'inventory';
    }

    /**
     * @return array{department_id: int|null, category_id: int|null, status: string|null, from: string|null, to: string|null}
     */
    private function filters(Request $request): array
    {
        return [
            'department_id' => $request->integer('department_id') ?: null,
            'category_id' => $request->integer('category_id') ?: null,
            'status' => $request->string('status')->toString() ?: null,
            'from' => $request->date('from')?->toDateString(),
            'to' => $request->date('to')?->toDateString(),
        ];
    }
}
