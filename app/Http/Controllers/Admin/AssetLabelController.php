<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Services\AssetQrCodeGenerator;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;

class AssetLabelController extends Controller
{
    public function __construct(private readonly AssetQrCodeGenerator $qrCodes) {}

    /**
     * Render a print-ready sheet of QR labels.
     *
     * Returned as a plain Blade page rather than an Inertia page so the browser's print
     * dialog gets a document with no application chrome around it.
     */
    public function sheet(Request $request): View
    {
        $validated = $request->validate([
            'assets' => ['nullable', 'array'],
            'assets.*' => ['integer'],
        ]);

        $assets = Asset::query()
            ->with(['category:id,name', 'department:id,name'])
            ->visibleTo($request->user())
            ->when(
                filled($validated['assets'] ?? null),
                fn ($query) => $query->whereIn('id', $validated['assets']),
                fn ($query) => $query->whereNot('status', 'RETIRED'),
            )
            ->orderBy('asset_tag')
            ->get();

        return view('labels.sheet', [
            'labels' => $assets->map(fn (Asset $asset): array => [
                'asset_tag' => $asset->asset_tag,
                'name' => $asset->name,
                'category' => $asset->category?->name,
                'department' => $asset->department?->name,
                'serial_number' => $asset->serial_number,
                'qr' => $this->qrCodes->dataUri($asset, 260),
            ])->all(),
            'organisation' => config('app.name'),
            'printedAt' => now(),
        ]);
    }
}
