<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Brings existing rows in line with the rule that an asset's department is its holder's.
 *
 * The column used to be filled in by hand on the register form, so it can say anything: a laptop
 * booked to Accounting while an IT technician holds it, or a department clinging to hardware that
 * was handed back months ago. Everything that scopes a department head, and every departmental
 * report, reads that column, so it has to start out telling the truth.
 *
 * There is no down(): the values this replaces were free-form entry with nothing to derive them
 * from, so putting them back is not possible. Restoring the column's old meaning only needs the
 * form field returned, which is a code change rather than a data one.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // An asset holds at most one open custody record, so this cannot match twice.
        $holders = DB::table('asset_assignments')
            ->join('users', 'users.id', '=', 'asset_assignments.user_id')
            ->whereNull('asset_assignments.returned_at')
            ->pluck('users.department_id', 'asset_assignments.asset_id');

        foreach (DB::table('assets')->pluck('department_id', 'id') as $assetId => $currentDepartmentId) {
            $correct = $holders[$assetId] ?? null;

            if ($correct === $currentDepartmentId) {
                continue;
            }

            DB::table('assets')->where('id', $assetId)->update(['department_id' => $correct]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Deliberately empty; see the class docblock.
    }
};
