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
        // The code prefixes every asset tag in the category, for example L-2026-0001.
        $categories = [
            ['name' => 'Laptop', 'code' => 'L', 'description' => 'Portable workstations issued to employees.'],
            ['name' => 'Desktop', 'code' => 'D', 'description' => 'Fixed workstations deployed per office seat.'],
            ['name' => 'Monitor', 'code' => 'M', 'description' => 'External displays paired with workstations.'],
            ['name' => 'Printer', 'code' => 'P', 'description' => 'Shared and personal printing devices.'],
            ['name' => 'Networking Device', 'code' => 'N', 'description' => 'Switches, routers, and access points.'],
            ['name' => 'Server', 'code' => 'S', 'description' => 'Rack and tower servers hosting internal systems.'],
            ['name' => 'Peripheral', 'code' => 'PR', 'description' => 'Keyboards, mice, scanners, and other accessories.'],
        ];

        foreach ($categories as $category) {
            AssetCategory::query()->firstOrCreate(['name' => $category['name']], $category);
        }
    }
}
