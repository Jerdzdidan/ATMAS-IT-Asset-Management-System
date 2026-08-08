<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('asset_categories', function (Blueprint $table) {
            $table->string('code', 10)->nullable()->after('name');
        });

        $this->backfillCodes();

        Schema::table('asset_categories', function (Blueprint $table) {
            $table->string('code', 10)->nullable(false)->change();
            $table->unique('code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('asset_categories', function (Blueprint $table) {
            $table->dropUnique(['code']);
            $table->dropColumn('code');
        });
    }

    /**
     * Derive a short prefix from each existing category name so asset tags can be generated.
     */
    private function backfillCodes(): void
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
};
