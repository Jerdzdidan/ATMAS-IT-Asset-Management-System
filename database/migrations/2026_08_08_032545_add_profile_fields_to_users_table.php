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
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 20)->default('EMPLOYEE')->after('email');
            $table->string('employee_code', 30)->nullable()->unique()->after('role');
            $table->foreignId('department_id')->nullable()->after('employee_code')->constrained()->nullOnDelete();
            $table->string('position', 100)->nullable()->after('department_id');
            $table->string('contact_number', 30)->nullable()->after('position');
            $table->string('status', 20)->default('ACTIVE')->after('contact_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('department_id');
            $table->dropColumn(['role', 'employee_code', 'position', 'contact_number', 'status']);
        });
    }
};
