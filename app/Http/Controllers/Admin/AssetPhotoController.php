<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAssetPhotoRequest;
use App\Models\Asset;
use App\Models\AssetPhoto;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AssetPhotoController extends Controller
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    /**
     * Attach one or more condition photographs to the asset.
     */
    public function store(StoreAssetPhotoRequest $request, Asset $asset): RedirectResponse
    {
        $hasPrimary = $asset->photos()->where('is_primary', true)->exists();

        foreach ($request->file('photos') as $upload) {
            $asset->photos()->create([
                'uploaded_by_id' => $request->user()->id,
                'path' => $upload->store("assets/{$asset->id}", 'public'),
                'original_name' => $upload->getClientOriginalName(),
                'size_bytes' => $upload->getSize(),
                'caption' => $request->validated('caption'),
                // The first photo on a bare asset becomes its thumbnail without being asked.
                'is_primary' => ! $hasPrimary,
            ]);

            $hasPrimary = true;
        }

        $this->auditLogger->record(
            AuditEvent::Updated,
            $asset,
            sprintf('Added %d photo(s) to asset %s', count($request->file('photos')), $asset->asset_tag),
        );

        return back()->with('success', 'Photos uploaded successfully.');
    }

    /**
     * Promote a photo to be the asset's thumbnail.
     */
    public function primary(Asset $asset, AssetPhoto $photo): RedirectResponse
    {
        $this->assertBelongsToAsset($asset, $photo);

        $asset->photos()->update(['is_primary' => false]);
        $photo->update(['is_primary' => true]);

        return back()->with('success', 'Primary photo updated.');
    }

    /**
     * Remove a photograph and the file behind it.
     */
    public function destroy(Asset $asset, AssetPhoto $photo): RedirectResponse
    {
        $this->assertBelongsToAsset($asset, $photo);

        Storage::disk('public')->delete($photo->path);
        $wasPrimary = $photo->is_primary;
        $photo->delete();

        // Never leave the asset without a thumbnail while it still has photos.
        if ($wasPrimary) {
            $asset->photos()->oldest('id')->first()?->update(['is_primary' => true]);
        }

        $this->auditLogger->record(AuditEvent::Updated, $asset, "Removed a photo from asset {$asset->asset_tag}");

        return back()->with('success', 'Photo deleted successfully.');
    }

    /**
     * Guard against a photo id from one asset being replayed against another.
     */
    private function assertBelongsToAsset(Asset $asset, AssetPhoto $photo): void
    {
        if ($photo->asset_id !== $asset->id) {
            throw ValidationException::withMessages(['photo' => 'That photo does not belong to this asset.']);
        }
    }
}
