<?php

namespace App\Services;

use App\Models\AssetTagSequence;
use Illuminate\Support\Facades\DB;

/**
 * Issues human-readable asset tags in the form YEAR-SEQUENCE, for example 2026-0001.
 *
 * The sequence runs per year and is never reused, so a tag identifies exactly one physical device
 * for the whole life of the register even after that device is deleted.
 */
class AssetTagGenerator
{
    /**
     * The number of digits the running sequence is padded to.
     */
    private const SEQUENCE_PADDING = 4;

    /**
     * Reserve the next tag for the acquisition year.
     */
    public function generate(?int $year = null): string
    {
        $year ??= (int) now()->year;

        return DB::transaction(function () use ($year): string {
            // Create the counter before locking it; the unique index settles any insert race.
            AssetTagSequence::query()->firstOrCreate(['year' => $year], ['next_number' => 1]);

            $sequence = AssetTagSequence::query()
                ->where('year', $year)
                ->lockForUpdate()
                ->firstOrFail();

            $number = $sequence->next_number;
            $sequence->update(['next_number' => $number + 1]);

            return $this->format($year, $number);
        });
    }

    /**
     * Report the tag the year would issue next without consuming the number.
     *
     * Intended for previews only; a concurrent registration can claim the number first.
     */
    public function peek(?int $year = null): string
    {
        $year ??= (int) now()->year;

        $number = AssetTagSequence::query()->where('year', $year)->value('next_number') ?? 1;

        return $this->format($year, $number);
    }

    /**
     * Assemble the two tag segments into their printed form.
     */
    private function format(int $year, int $number): string
    {
        return sprintf('%d-%0'.self::SEQUENCE_PADDING.'d', $year, $number);
    }
}
