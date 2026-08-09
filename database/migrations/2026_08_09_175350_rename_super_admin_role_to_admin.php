<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Carry the accounts holding the old role name over to the new one.
     *
     * The column is a plain string rather than a database enum, so only the stored values move;
     * there is no column definition to rewrite.
     */
    public function up(): void
    {
        DB::table('users')->where('role', 'SUPER_ADMIN')->update(['role' => 'ADMIN']);
    }

    public function down(): void
    {
        DB::table('users')->where('role', 'ADMIN')->update(['role' => 'SUPER_ADMIN']);
    }
};
