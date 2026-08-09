<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AuditEvent;
use App\Exports\AssetImportTemplateExport;
use App\Exports\AssetsExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\ImportAssetsRequest;
use App\Imports\AssetsImport;
use App\Models\AssetCategory;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Moves the register in and out of Excel.
 */
class AssetPortabilityController extends Controller
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    /**
     * Display the bulk import and export console.
     */
    public function index(): Response
    {
        return Inertia::render('admin/import-export', [
            'columns' => AssetImportTemplateExport::COLUMNS,
            'categories' => AssetCategory::query()->select(['name'])->orderBy('name')->get(),
        ]);
    }

    /**
     * Download the whole visible register as a workbook.
     */
    public function export(Request $request): BinaryFileResponse
    {
        $this->auditLogger->record(AuditEvent::Exported, null, 'Exported the asset register to Excel');

        return (new AssetsExport($request->user()))->download(
            sprintf('asset-register-%s.xlsx', now()->format('Y-m-d')),
        );
    }

    /**
     * Download the blank import workbook, pre-filled with the values this instance accepts.
     */
    public function template(): BinaryFileResponse
    {
        return (new AssetImportTemplateExport(
            AssetCategory::query()->orderBy('name')->pluck('name')->all(),
        ))->download('asset-import-template.xlsx');
    }

    /**
     * Load a workbook of assets into the register.
     *
     * The run is wrapped in a transaction so a failure partway through cannot leave the
     * register holding half a spreadsheet.
     */
    public function import(ImportAssetsRequest $request): RedirectResponse
    {
        $import = new AssetsImport;

        DB::transaction(function () use ($import, $request): void {
            Excel::import($import, $request->file('file'));
        });

        $summary = $import->summary();

        $this->auditLogger->record(
            AuditEvent::Imported,
            null,
            sprintf('Imported %d asset(s) from a spreadsheet, %d row(s) rejected', $summary['imported'], $summary['failed']),
            $summary['errors'] === [] ? [] : ['rejected_rows' => $summary['errors']],
        );

        return back()->with('importSummary', $summary)->with(
            $summary['imported'] > 0 ? 'success' : 'error',
            $summary['imported'] > 0
                ? "Imported {$summary['imported']} asset(s)."
                : 'No assets were imported. Check the row errors below.',
        );
    }
}
