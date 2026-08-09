<?php

namespace App\Services;

use App\Models\Asset;
use GdImage;
use RuntimeException;

/**
 * Composes an asset's printable label into a single PNG.
 *
 * The label is drawn rather than rendered to PDF because a one-up sticker is normally dropped
 * into label-printer software or another document, where a page-sized PDF is only in the way.
 */
class AssetLabelImageGenerator
{
    private const HEIGHT = 330;

    /**
     * Close to one cell on the PDF sheet (179.31pt x 60pt, so 986px at this height), trimmed
     * slightly to carry less empty space on the right. Fixed rather than measured, so every
     * sticker comes out the same size whatever text it holds.
     */
    private const WIDTH = 900;

    private const PADDING = 26;

    /** Gap between the QR code and the text column. */
    private const GUTTER = 34;

    private const BRAND = [0x38, 0x4D, 0x9C];

    private const INK = [0x22, 0x24, 0x2E];

    private const MUTED = [0x6A, 0x6D, 0x7D];

    private const BORDER = [0xC9, 0xCE, 0xE0];

    /** Side of the organisation mark on the closing line. */
    private const MARK_SIZE = 26;

    public function __construct(private readonly AssetQrCodeGenerator $qrCodes) {}

    /**
     * Render the label and return the raw PNG bytes.
     */
    public function pngBinary(Asset $asset): string
    {
        $qrSize = self::HEIGHT - (self::PADDING * 2);
        $left = self::PADDING + $qrSize + self::GUTTER;

        // The canvas is fixed, so anything too long for the remaining column is ellipsized.
        $lines = $this->measure($this->lines($asset), self::WIDTH - $left - self::PADDING);

        $canvas = imagecreatetruecolor(self::WIDTH, self::HEIGHT);

        if ($canvas === false) {
            throw new RuntimeException('Could not allocate the label canvas.');
        }

        imagefill($canvas, 0, 0, (int) imagecolorallocate($canvas, 255, 255, 255));
        imagerectangle($canvas, 0, 0, self::WIDTH - 1, self::HEIGHT - 1, $this->color($canvas, self::BORDER));

        $this->drawQrCode($canvas, $asset, $qrSize);
        $this->drawLines($canvas, $lines, $left);

        ob_start();
        imagepng($canvas);
        $binary = (string) ob_get_clean();
        imagedestroy($canvas);

        return $binary;
    }

    /**
     * The filename the browser should save the label under.
     */
    public function filenameFor(Asset $asset): string
    {
        return sprintf('asset-label-%s.png', $asset->asset_tag);
    }

    /**
     * The stack of text that sits beside the code, skipping anything the asset does not carry.
     *
     * @return list<array{text: string, size: int, font: string, color: array<int, int>, gap: int, mark?: bool}>
     */
    private function lines(Asset $asset): array
    {
        $regular = $this->fontPath('DejaVuSans.ttf');
        $bold = $this->fontPath('DejaVuSans-Bold.ttf');
        $classification = array_filter([$asset->category?->name, $asset->department?->name]);

        return array_values(array_filter([
            ['text' => (string) $asset->asset_tag, 'size' => 34, 'font' => $bold, 'color' => self::BRAND, 'gap' => 22],
            ['text' => (string) $asset->name, 'size' => 22, 'font' => $regular, 'color' => self::INK, 'gap' => 18],
            $classification === []
                ? null
                : ['text' => implode(' · ', $classification), 'size' => 16, 'font' => $regular, 'color' => self::MUTED, 'gap' => 12],
            filled($asset->serial_number)
                ? ['text' => 'SN: '.$asset->serial_number, 'size' => 16, 'font' => $regular, 'color' => self::MUTED, 'gap' => 12]
                : null,
            ['text' => (string) config('app.name'), 'size' => 15, 'font' => $regular, 'color' => self::MUTED, 'gap' => 0, 'mark' => true],
        ]));
    }

    /**
     * Fit each line to the column and record the metrics the layout needs.
     *
     * @param  list<array<string, mixed>>  $lines
     * @return list<array<string, mixed>>
     */
    private function measure(array $lines, int $available): array
    {
        return array_map(function (array $line) use ($available): array {
            $indent = ($line['mark'] ?? false) ? self::MARK_SIZE + 10 : 0;
            $text = $this->fit((string) $line['text'], $line['size'], $line['font'], $available - $indent);
            $box = imagettfbbox($line['size'], 0, $line['font'], $text);

            // The mark is taller than the caption beside it, so it sets that line's height.
            $ascent = $box === false ? $line['size'] : (int) abs($box[7]);
            $descent = $box === false ? 0 : (int) abs($box[1]);

            return [
                ...$line,
                'text' => $text,
                'indent' => $indent,
                'ascent' => $ascent,
                'height' => max($ascent + $descent, ($line['mark'] ?? false) ? self::MARK_SIZE : 0),
            ];
        }, $lines);
    }

    /**
     * Paint the QR code down the left-hand side, resampled to the label's height.
     */
    private function drawQrCode(GdImage $canvas, Asset $asset, int $size): void
    {
        $qr = imagecreatefromstring($this->qrCodes->pngBinary($asset, 600));

        if ($qr === false) {
            throw new RuntimeException('Could not read the generated QR code.');
        }

        imagecopyresampled($canvas, $qr, self::PADDING, self::PADDING, 0, 0, $size, $size, imagesx($qr), imagesy($qr));
        imagedestroy($qr);
    }

    /**
     * Draw the measured stack, centred against the code beside it.
     *
     * @param  list<array<string, mixed>>  $lines
     */
    private function drawLines(GdImage $canvas, array $lines, int $left): void
    {
        $total = array_sum(array_column($lines, 'height')) + array_sum(array_column($lines, 'gap'));
        $cursor = (int) ((self::HEIGHT - $total) / 2);
        $mark = $this->brandMark();

        foreach ($lines as $line) {
            if (($line['mark'] ?? false) && $mark !== null) {
                imagecopyresampled($canvas, $mark, $left, $cursor, 0, 0, self::MARK_SIZE, self::MARK_SIZE, imagesx($mark), imagesy($mark));
            }

            imagettftext(
                $canvas,
                $line['size'],
                0,
                $left + $line['indent'],
                // A marked line rides the mark's optical centre instead of the stack's baseline.
                $cursor + (($line['mark'] ?? false) ? (int) (self::MARK_SIZE * 0.74) : $line['ascent']),
                $this->color($canvas, $line['color']),
                $line['font'],
                $line['text'],
            );

            $cursor += $line['height'] + $line['gap'];
        }

        if ($mark !== null) {
            imagedestroy($mark);
        }
    }

    /**
     * Load the brand mark with its transparency intact, or null when it is missing.
     */
    private function brandMark(): ?GdImage
    {
        $path = public_path('images/forms-international-logo-192.png');

        if (! is_file($path)) {
            return null;
        }

        $mark = @imagecreatefrompng($path);

        if ($mark === false) {
            return null;
        }

        imagealphablending($mark, true);
        imagesavealpha($mark, true);

        return $mark;
    }

    /**
     * Shorten a line with an ellipsis until it fits the column.
     */
    private function fit(string $text, int $size, string $font, int $available): string
    {
        if ($this->textWidth($text, $size, $font) <= $available) {
            return $text;
        }

        $trimmed = $text;

        while ($trimmed !== '' && $this->textWidth($trimmed.'…', $size, $font) > $available) {
            $trimmed = mb_substr($trimmed, 0, -1);
        }

        return $trimmed.'…';
    }

    private function textWidth(string $text, int $size, string $font): int
    {
        $box = imagettfbbox($size, 0, $font, $text);

        return $box === false ? 0 : (int) (max($box[2], $box[4]) - min($box[0], $box[6]));
    }

    /**
     * @param  array<int, int>  $rgb
     */
    private function color(GdImage $canvas, array $rgb): int
    {
        return (int) imagecolorallocate($canvas, $rgb[0], $rgb[1], $rgb[2]);
    }

    /**
     * DejaVu ships with the PDF renderer, so the label needs no font of its own.
     */
    private function fontPath(string $file): string
    {
        $path = base_path('vendor/dompdf/dompdf/lib/fonts/'.$file);

        if (! is_file($path)) {
            throw new RuntimeException("The label font [{$file}] is missing.");
        }

        return $path;
    }
}
