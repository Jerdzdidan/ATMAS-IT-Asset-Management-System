<?php

namespace App\Services;

use App\Models\Asset;
use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\Writer\PngWriter;
use Illuminate\Support\Str;

/**
 * Renders the QR code printed on an asset's label.
 *
 * The code carries the absolute lookup URL rather than the bare tag, so a phone's stock camera
 * opens the asset straight away while the in-app scanner still recovers the tag from the path.
 */
class AssetQrCodeGenerator
{
    /**
     * High correction keeps the code readable once the sticker is scuffed or partly peeled.
     */
    private const CORRECTION_LEVEL = ErrorCorrectionLevel::High;

    /**
     * The URL encoded into the asset's QR code.
     */
    public function payloadFor(Asset $asset): string
    {
        return route('assets.lookup', ['tag' => $asset->asset_tag]);
    }

    /**
     * Render the asset's QR code as a base64 data URI ready to drop into an `img` tag.
     */
    public function dataUri(Asset $asset, int $size = 320): string
    {
        return (new Builder(
            writer: new PngWriter,
            data: $this->payloadFor($asset),
            errorCorrectionLevel: self::CORRECTION_LEVEL,
            size: $size,
            margin: 8,
        ))->build()->getDataUri();
    }

    /**
     * Recover an asset tag from whatever a scanner handed back.
     *
     * Accepts the full lookup URL, a bare tag, and the lower-case or space-padded variants that
     * hardware scanners tend to emit.
     */
    public function extractTag(string $scanned): string
    {
        $value = trim($scanned);

        if (Str::startsWith($value, ['http://', 'https://'])) {
            $value = basename((string) parse_url($value, PHP_URL_PATH));
        }

        return Str::upper(urldecode($value));
    }
}
