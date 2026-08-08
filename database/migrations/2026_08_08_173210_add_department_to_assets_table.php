<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Record the department accountable for each asset.
     *
     * This is the owning department rather than the custodian's: a shared printer belongs to
     * Accounting even while nobody holds it, which is what departmental reporting counts.
     */
    public function up(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->foreignId('department_id')
                ->nullable()
                ->after('asset_category_id')
                ->constrained()
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->dropConstrainedForeignId('department_id');
        });
    }
};
