<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Services\AssetQrCodeGenerator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AssetLookupController extends Controller
{
    public function __construct(private readonly AssetQrCodeGenerator $qrCodes) {}

    /**
     * Display the camera scanner used during a physical inventory count.
     */
    public function scan(): Response
    {
        return Inertia::render('admin/scan');
    }

    /**
     * Resolve whatever the scanner or the manual field produced into an asset page.
     */
    public function resolve(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:255'],
        ]);

        return $this->redirectToTag($request, $this->qrCodes->extractTag($validated['code']));
    }

    /**
     * Open the asset behind a scanned label.
     *
     * This is the address printed into the QR code, so a phone camera lands here directly and
     * the auth middleware sends an unauthenticated scan through the login page first.
     */
    public function lookup(Request $request, string $tag): RedirectResponse
    {
        return $this->redirectToTag($request, $this->qrCodes->extractTag($tag));
    }

    /**
     * Send the operator to the asset carrying the tag, or explain why they cannot see it.
     */
    private function redirectToTag(Request $request, string $tag): RedirectResponse
    {
        $asset = Asset::query()->where('asset_tag', $tag)->first();

        if ($asset === null) {
            throw ValidationException::withMessages(['code' => "No asset is registered under the tag {$tag}."]);
        }

        if (! $asset->isVisibleTo($request->user())) {
            throw ValidationException::withMessages(['code' => "Asset {$tag} belongs to another department."]);
        }

        return to_route('admin.assets.show', $asset);
    }
}
