<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Services\AssetLabelImageGenerator;
use App\Services\AssetQrCodeGenerator;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AssetLabelController extends Controller
{
    public function __construct(
        private readonly AssetQrCodeGenerator $qrCodes,
        private readonly AssetLabelImageGenerator $labelImages,
    ) {}

    /**
     * The label picker: choose which assets go onto the sheet, then download it.
     *
     * Deliberately sends no QR codes. Rendering one per asset up front would be wasted work for
     * every row the user does not pick; the preview asks for them one at a time instead.
     */
    public function sheet(Request $request): Response
    {
        $assets = Asset::query()
            ->with(['category:id,name', 'department:id,name'])
            ->visibleTo($request->user())
            ->orderBy('asset_tag')
            ->get(['id', 'asset_tag', 'name', 'serial_number', 'status', 'asset_category_id', 'department_id']);

        return Inertia::render('admin/labels', [
            'assets' => $assets->map(fn (Asset $asset): array => [
                'id' => $asset->id,
                'asset_tag' => $asset->asset_tag,
                'name' => $asset->name,
                'serial_number' => $asset->serial_number,
                'status' => $asset->status,
                'category' => $asset->category?->name,
                'department' => $asset->department?->name,
            ])->all(),
            'categories' => $assets->pluck('category.name')->filter()->unique()->sort()->values()->all(),
            'departments' => $assets->pluck('department.name')->filter()->unique()->sort()->values()->all(),
            'initialSelection' => $this->requestedIds($request),
        ]);
    }

    /**
     * Download the same sheet as a PDF.
     *
     * DomPDF rather than a browser print dialog, so the QR codes embed at their full PNG
     * resolution and stay scannable once the sticker is on the hardware.
     */
    public function download(Request $request): HttpResponse
    {
        $assets = $this->selectedAssets($request);

        return Pdf::loadView('labels.pdf', [
            'labels' => $this->labelData($assets),
            'organisation' => config('app.name'),
            'printedAt' => now(),
            'logo' => $this->brandMarkDataUri(),
        ])->setPaper('a4', 'portrait')->download(sprintf('asset-labels-%s.pdf', now()->format('Y-m-d')));
    }

    /**
     * Download a single asset's label as a PNG.
     *
     * An image rather than a one-up PDF: a single sticker is normally placed into label-printer
     * software or another document, and a page-sized PDF only wastes a sheet on the way there.
     */
    public function single(Request $request, Asset $asset): StreamedResponse
    {
        abort_unless($asset->isVisibleTo($request->user()), 404);

        $asset->loadMissing(['category:id,name', 'department:id,name']);

        $binary = $this->labelImages->pngBinary($asset);

        return response()->streamDownload(function () use ($binary): void {
            echo $binary;
        }, $this->labelImages->filenameFor($asset), ['Content-Type' => 'image/png']);
    }

    /**
     * The assets the request asked for, falling back to everything still in service.
     *
     * @return Collection<int, Asset>
     */
    private function selectedAssets(Request $request): Collection
    {
        $ids = $this->requestedIds($request);

        return Asset::query()
            ->with(['category:id,name', 'department:id,name'])
            ->visibleTo($request->user())
            ->when(
                $ids !== [],
                fn ($query) => $query->whereIn('id', $ids),
                fn ($query) => $query->whereNot('status', 'RETIRED'),
            )
            ->orderBy('asset_tag')
            ->get();
    }

    /**
     * The asset ids named in the request, if any.
     *
     * Accepts a comma-separated list as well as the repeated `assets[]` form, because a hand-picked
     * sheet of several hundred labels would otherwise push the query string past what servers
     * accept on a single line.
     *
     * @return list<int>
     */
    private function requestedIds(Request $request): array
    {
        $raw = $request->input('assets');

        if (is_string($raw)) {
            $raw = explode(',', $raw);
        }

        return collect(is_array($raw) ? $raw : [])
            ->map(fn ($id): int => (int) $id)
            ->filter(fn (int $id): bool => $id > 0)
            ->unique()
            ->values()
            ->all();
    }

    /**
     * Flatten the assets into the fields a label actually prints.
     *
     * @param  Collection<int, Asset>  $assets
     * @return list<array<string, mixed>>
     */
    private function labelData(Collection $assets): array
    {
        return $assets->map(fn (Asset $asset): array => [
            'asset_tag' => $asset->asset_tag,
            'name' => $asset->name,
            'category' => $asset->category?->name,
            'department' => $asset->department?->name,
            'serial_number' => $asset->serial_number,
            'qr' => $this->qrCodes->dataUri($asset, 260),
        ])->values()->all();
    }

    /**
     * The brand mark, inlined because DomPDF fetches no HTTP assets.
     */
    private function brandMarkDataUri(): string
    {
        $path = public_path('images/forms-international-logo-192.png');

        return is_file($path)
            ? 'data:image/png;base64,'.base64_encode((string) file_get_contents($path))
            : '';
    }
}
