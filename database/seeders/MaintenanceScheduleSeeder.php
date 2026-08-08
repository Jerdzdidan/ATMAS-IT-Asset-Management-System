<?php

namespace Database\Seeders;

use App\Enums\MaintenanceFrequency;
use App\Models\Asset;
use App\Models\AssetCategory;
use App\Models\MaintenanceSchedule;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class MaintenanceScheduleSeeder extends Seeder
{
    /**
     * Attach preventive maintenance plans to the hardware that ordinarily carries one.
     *
     * The due dates are spread either side of today on purpose, so the overdue counters and
     * the "due soon" list both have something to show without anyone editing data first.
     */
    public function run(): void
    {
        $plans = [
            'Server' => [
                ['title' => 'Firmware patching and disk health check', 'frequency' => MaintenanceFrequency::Quarterly, 'offset' => -12],
                ['title' => 'Backup restore drill', 'frequency' => MaintenanceFrequency::SemiAnnual, 'offset' => 24],
            ],
            'Networking Device' => [
                ['title' => 'Switch and access point firmware review', 'frequency' => MaintenanceFrequency::SemiAnnual, 'offset' => -3],
            ],
            'Printer' => [
                ['title' => 'Roller cleaning and toner inspection', 'frequency' => MaintenanceFrequency::Quarterly, 'offset' => 9],
            ],
            'Desktop' => [
                ['title' => 'Dust removal and thermal check', 'frequency' => MaintenanceFrequency::Annual, 'offset' => 45],
            ],
            'Laptop' => [
                ['title' => 'Battery health and OS update check', 'frequency' => MaintenanceFrequency::SemiAnnual, 'offset' => 18],
            ],
        ];

        $categories = AssetCategory::query()->pluck('id', 'name');

        foreach ($plans as $categoryName => $categoryPlans) {
            $assets = Asset::query()
                ->where('asset_category_id', $categories[$categoryName])
                ->whereNot('status', 'RETIRED')
                ->orderBy('id')
                // Enough coverage to be believable without a plan on every last keyboard.
                ->limit($categoryName === 'Laptop' || $categoryName === 'Desktop' ? 3 : 5)
                ->get();

            foreach ($assets as $index => $asset) {
                foreach ($categoryPlans as $plan) {
                    MaintenanceSchedule::create([
                        'asset_id' => $asset->id,
                        'title' => $plan['title'],
                        'frequency' => $plan['frequency'],
                        'next_due_on' => Carbon::today()->addDays($plan['offset'] + ($index * 7))->toDateString(),
                        'last_completed_on' => Carbon::today()
                            ->addDays($plan['offset'] + ($index * 7))
                            ->subMonthsNoOverflow($plan['frequency']->months())
                            ->toDateString(),
                        'instructions' => 'Follow the standard checklist and record the readings in the service notes.',
                    ]);
                }
            }
        }
    }
}
