<?php

namespace Database\Seeders;

use App\Models\AssetCategory;
use Illuminate\Database\Seeder;

class AssetCategorySeeder extends Seeder
{
    /**
     * Seed the device types used to classify the hardware register.
     */
    public function run(): void
    {
        $categories = [
            ['name' => 'Laptop', 'description' => 'Portable workstations issued to employees.'],
            ['name' => 'Desktop', 'description' => 'Fixed workstations deployed per office seat.'],
            ['name' => 'Monitor', 'description' => 'External displays paired with workstations.'],
            ['name' => 'Printer', 'description' => 'Shared and personal printing devices.'],
            ['name' => 'Networking Device', 'description' => 'Switches, routers, and access points.'],
            ['name' => 'Server', 'description' => 'Rack and tower servers hosting internal systems.'],
            ['name' => 'Peripheral', 'description' => 'Keyboards, mice, scanners, and other accessories.'],
        ];

        foreach ($categories as $category) {
            AssetCategory::query()->firstOrCreate(['name' => $category['name']], $category);
        }
    }
}
