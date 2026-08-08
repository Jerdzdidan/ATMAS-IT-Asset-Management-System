<?php

namespace App\Services;

use App\Models\AssetCategory;
use App\Models\AssetTagSequence;
use Illuminate\Support\Facades\DB;

/**
 * Issues human-readable asset tags in the form CODE-YEAR-SEQUENCE, for example L-2026-0001.
 *
 * The sequence runs per category per year and is never reused, so a tag identifies exactly
 * one physical device for the whole life of the register even after that device is deleted.
 */
class AssetTagGenerator
{
    /**
     * The number of digits the running sequence is padded to.
     */
    private const SEQUENCE_PADDING = 4;

    /**
     * Reserve the next tag for the category and acquisition year.
     */
    public function generate(AssetCategory $category, ?int $year = null): string
    {
        $year ??= (int) now()->year;

        return DB::transaction(function () use ($category, $year): string {
            // Create the counter before locking it; the unique index settles any insert race.
            AssetTagSequence::query()->firstOrCreate(
                ['category_code' => $category->code, 'year' => $year],
                ['next_number' => 1],
            );

            $sequence = AssetTagSequence::query()
                ->where('category_code', $category->code)
                ->where('year', $year)
                ->lockForUpdate()
                ->firstOrFail();

            $number = $sequence->next_number;
            $sequence->update(['next_number' => $number + 1]);

            return $this->format($category->code, $year, $number);
        });
    }

    /**
     * Report the tag the category would receive next without consuming the number.
     *
     * Intended for previews only; a concurrent registration can claim the number first.
     */
    public function peek(AssetCategory $category, ?int $year = null): string
    {
        $year ??= (int) now()->year;

        $number = AssetTagSequence::query()
            ->where('category_code', $category->code)
            ->where('year', $year)
            ->value('next_number') ?? 1;

        return $this->format($category->code, $year, $number);
    }

    /**
     * Assemble the three tag segments into their printed form.
     */
    private function format(string $categoryCode, int $year, int $number): string
    {
        return sprintf('%s-%d-%0'.self::SEQUENCE_PADDING.'d', $categoryCode, $year, $number);
    }
}
