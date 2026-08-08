<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Store the condition photographs captured against each asset.
     *
     * One photo per asset carries `is_primary` so the register and label sheets have a
     * thumbnail to show without loading the whole gallery.
     */
    public function up(): void
    {
        Schema::create('asset_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained()->cascadeOnDelete();
            $table->foreignId('uploaded_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('path');
            $table->string('original_name', 150);
            $table->unsignedInteger('size_bytes');
            $table->string('caption', 150)->nullable();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->index(['asset_id', 'is_primary']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_photos');
    }
};
