<?php

namespace Database\Seeders;

use App\Enums\AssetStatus;
use App\Enums\UserRole;
use App\Models\Asset;
use App\Models\AssetCategory;
use App\Models\User;
use App\Services\AssetAssignmentService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class AssetSeeder extends Seeder
{
    public function __construct(private AssetAssignmentService $assignmentService) {}

    /**
     * Seed the hardware register and issue part of it to employees.
     */
    public function run(): void
    {
        $categories = AssetCategory::query()->pluck('id', 'name');
        $custodian = User::query()->where('role', UserRole::ItStaff)->firstOrFail();

        /*
         * None of these carry a department. An asset belongs to one only through whoever holds
         * it, so freshly registered stock belongs to nobody until it is issued — which is what
         * issueAssetsToEmployees below does, and where every department on the register comes
         * from. Setting one here would seed exactly the drift the rule exists to prevent.
         */
        $blueprints = [
            ['category' => 'Laptop', 'name' => 'Dell Latitude 5420', 'brand' => 'Dell', 'count' => 10],
            ['category' => 'Laptop', 'name' => 'Lenovo ThinkPad E14', 'brand' => 'Lenovo', 'count' => 6],
            ['category' => 'Desktop', 'name' => 'HP ProDesk 400 G7', 'brand' => 'HP', 'count' => 10],
            ['category' => 'Monitor', 'name' => 'Acer 24" LED Monitor', 'brand' => 'Acer', 'count' => 8],
            ['category' => 'Printer', 'name' => 'Epson L3210 EcoTank', 'brand' => 'Epson', 'count' => 4],
            ['category' => 'Networking Device', 'name' => 'Cisco Catalyst 1000 Switch', 'brand' => 'Cisco', 'count' => 3],
            ['category' => 'Server', 'name' => 'Dell PowerEdge T40', 'brand' => 'Dell', 'count' => 2],
            ['category' => 'Peripheral', 'name' => 'Logitech Wireless Keyboard', 'brand' => 'Logitech', 'count' => 5],
        ];

        foreach ($blueprints as $blueprint) {
            Asset::factory()
                ->count($blueprint['count'])
                ->state([
                    'asset_category_id' => $categories[$blueprint['category']],
                    'name' => $blueprint['name'],
                    'brand' => $blueprint['brand'],
                ])
                ->create();
        }

        Asset::factory()
            ->count(3)
            ->retired()
            ->state([
                'asset_category_id' => $categories['Desktop'],
                'name' => 'HP Compaq Pro 6300',
                'brand' => 'HP',
            ])
            ->create();

        $this->issueAssetsToEmployees($custodian);
    }

    /**
     * Hand a slice of the register to employees so custody history is not empty.
     *
     * This is also what gives the register its departments: each issue carries the holder's
     * department onto the asset, so the department views and the custody records are describing
     * one fact rather than two that have to be kept in step. Anything left in stock stays
     * unassigned to any department, which is the honest answer for hardware nobody holds.
     */
    private function issueAssetsToEmployees(User $custodian): void
    {
        $employees = User::query()
            ->where('role', UserRole::Employee)
            ->where('status', 'ACTIVE')
            ->whereNotNull('department_id')
            ->get();

        $issuableCategoryIds = AssetCategory::query()->whereIn('name', ['Laptop', 'Desktop'])->pluck('id');

        foreach ($employees as $employee) {
            // Issuing flips the asset to Assigned, so each pass draws from what is still in stock.
            $asset = Asset::query()
                ->whereIn('asset_category_id', $issuableCategoryIds)
                ->where('status', AssetStatus::Available)
                ->inRandomOrder()
                ->first();

            if ($asset === null) {
                continue;
            }

            $this->assignmentService->assign(
                $asset,
                $employee,
                $custodian,
                Carbon::now()->subDays(fake()->numberBetween(20, 400)),
                'Issued during the scheduled equipment rollout.',
            );
        }
    }
}
