<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Drops the category prefix from asset tags, leaving the form YEAR-SEQUENCE.
 *
 * The running number now belongs to the year alone rather than to a category within it, so the
 * counter table is rebuilt around that and existing tags are renumbered — merging the per-category
 * sequences would otherwise collide the moment two categories shared a year and a number.
 */
return new class extends Migration
{
    /**
     * The number of digits the running sequence is padded to, mirroring AssetTagGenerator.
     */
    private const SEQUENCE_PADDING = 4;

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $this->renumberTags();

        Schema::table('asset_categories', function (Blueprint $table) {
            $table->dropUnique(['code']);
            $table->dropColumn('code');
        });

        // A pure counter table, so recreating it beats reshaping it around the dropped column.
        Schema::dropIfExists('asset_tag_sequences');

        Schema::create('asset_tag_sequences', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('year')->unique();
            $table->unsignedInteger('next_number')->default(1);
            $table->timestamps();
        });

        $this->rebuildCounters();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('asset_categories', function (Blueprint $table) {
            $table->string('code', 10)->nullable()->after('name');
        });

        $this->backfillCategoryCodes();

        Schema::table('asset_categories', function (Blueprint $table) {
            $table->string('code', 10)->nullable(false)->change();
            $table->unique('code');
        });

        $this->restorePrefixedTags();

        Schema::dropIfExists('asset_tag_sequences');

        Schema::create('asset_tag_sequences', function (Blueprint $table) {
            $table->id();
            $table->string('category_code', 10);
            $table->unsignedSmallInteger('year');
            $table->unsignedInteger('next_number')->default(1);
            $table->timestamps();

            $table->unique(['category_code', 'year']);
        });

        $this->rebuildPrefixedCounters();
    }

    /**
     * Reissue every tag as YEAR-SEQUENCE, numbering by registration order within each year.
     *
     * Rows are walked oldest first so the new numbers run in the order the assets were entered,
     * which is as close to the old meaning of the sequence as a merged counter can get.
     */
    private function renumberTags(): void
    {
        $counters = [];

        foreach (DB::table('assets')->orderBy('id')->get(['id', 'asset_tag']) as $asset) {
            $year = $this->yearFromTag((string) $asset->asset_tag);
            $counters[$year] = ($counters[$year] ?? 0) + 1;

            DB::table('assets')->where('id', $asset->id)->update([
                'asset_tag' => $this->format($year, $counters[$year]),
            ]);
        }
    }

    /**
     * Put the category prefix back, keeping each tag's year and number.
     */
    private function restorePrefixedTags(): void
    {
        $codes = DB::table('asset_categories')->pluck('code', 'id');

        foreach (DB::table('assets')->orderBy('id')->get(['id', 'asset_tag', 'asset_category_id']) as $asset) {
            $code = $codes[$asset->asset_category_id] ?? 'CAT';

            DB::table('assets')->where('id', $asset->id)->update([
                'asset_tag' => $code.'-'.$asset->asset_tag,
            ]);
        }
    }

    /**
     * Seed one counter per year, positioned just past the highest number that year already uses.
     */
    private function rebuildCounters(): void
    {
        $highest = [];

        foreach (DB::table('assets')->pluck('asset_tag') as $tag) {
            [$year, $number] = $this->segmentsOf((string) $tag);
            $highest[$year] = max($highest[$year] ?? 0, $number);
        }

        foreach ($highest as $year => $number) {
            DB::table('asset_tag_sequences')->insert([
                'year' => $year,
                'next_number' => $number + 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * The reverse of {@see rebuildCounters()}: one counter per category per year.
     */
    private function rebuildPrefixedCounters(): void
    {
        $codes = DB::table('asset_categories')->pluck('code', 'id');
        $highest = [];

        foreach (DB::table('assets')->get(['asset_tag', 'asset_category_id']) as $asset) {
            $code = $codes[$asset->asset_category_id] ?? 'CAT';
            [$year, $number] = $this->segmentsOf((string) $asset->asset_tag);
            $key = $code.'|'.$year;
            $highest[$key] = max($highest[$key] ?? 0, $number);
        }

        foreach ($highest as $key => $number) {
            [$code, $year] = explode('|', $key);

            DB::table('asset_tag_sequences')->insert([
                'category_code' => $code,
                'year' => (int) $year,
                'next_number' => $number + 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Derive a short prefix from each category name, matching how the codes were first backfilled.
     */
    private function backfillCategoryCodes(): void
    {
        $used = [];

        foreach (DB::table('asset_categories')->orderBy('id')->get() as $category) {
            $initials = collect(preg_split('/[^A-Za-z0-9]+/', (string) $category->name, -1, PREG_SPLIT_NO_EMPTY))
                ->map(fn (string $word): string => Str::upper(Str::substr($word, 0, 1)))
                ->implode('');

            $base = Str::substr($initials !== '' ? $initials : 'CAT', 0, 10);
            $code = $base;
            $suffix = 1;

            while (in_array($code, $used, true)) {
                $code = Str::substr($base, 0, 9).$suffix;
                $suffix++;
            }

            $used[] = $code;

            DB::table('asset_categories')->where('id', $category->id)->update(['code' => $code]);
        }
    }

    /**
     * Read the year and running number out of a tag in either the old or the new form.
     *
     * @return array{0: int, 1: int}
     */
    private function segmentsOf(string $tag): array
    {
        if (preg_match('/(\d{4})-(\d+)$/', $tag, $matches) === 1) {
            return [(int) $matches[1], (int) $matches[2]];
        }

        return [(int) now()->year, 0];
    }

    private function yearFromTag(string $tag): int
    {
        return $this->segmentsOf($tag)[0];
    }

    private function format(int $year, int $number): string
    {
        return sprintf('%d-%0'.self::SEQUENCE_PADDING.'d', $year, $number);
    }
};
