<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Create the recurring preventive maintenance plans attached to assets.
     *
     * `next_due_on` is stored rather than derived so a service logged early or late moves the
     * whole series with it, which is how technicians expect a PM plan to behave.
     */
    public function up(): void
    {
        Schema::create('maintenance_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained()->cascadeOnDelete();
            $table->string('title', 150);
            $table->string('frequency', 20);
            $table->date('next_due_on');
            $table->date('last_completed_on')->nullable();
            $table->text('instructions')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['is_active', 'next_due_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_schedules');
    }
};
