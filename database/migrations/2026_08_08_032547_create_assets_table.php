<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->string('asset_tag', 50)->unique();
            $table->string('name', 150);
            $table->foreignId('asset_category_id')->constrained()->restrictOnDelete();
            $table->string('brand', 100)->nullable();
            $table->string('model', 100)->nullable();
            $table->string('serial_number', 100)->nullable()->unique();
            $table->string('location', 150)->nullable();
            $table->string('status', 20)->default('AVAILABLE');
            $table->string('condition', 20)->default('GOOD');
            $table->date('purchase_date')->nullable();
            $table->date('warranty_expires_at')->nullable();
            $table->decimal('purchase_cost', 12, 2)->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assets');
    }
};
