<?php

namespace Database\Seeders;

use App\Services\AuditLogger;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * The bulk seeders run with the audit trail switched off: an entry per inserted row would
     * bury the entries that describe real activity. ActivityLogSeeder then reconstructs a
     * believable trail from the records that were created.
     */
    public function run(): void
    {
        AuditLogger::withoutRecording(function (): void {
            $this->call([
                DepartmentSeeder::class,
                AssetCategorySeeder::class,
                UserSeeder::class,
                AssetSeeder::class,
                MaintenanceRequestSeeder::class,
                MaintenanceScheduleSeeder::class,
            ]);
        });

        $this->call(ActivityLogSeeder::class);
    }
}
