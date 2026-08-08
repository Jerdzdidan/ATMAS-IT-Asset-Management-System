<?php

namespace Database\Seeders;

use App\Enums\AssetStatus;
use App\Enums\UserRole;
use App\Models\Asset;
use App\Models\AssetCategory;
use App\Models\Department;
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
        $departments = Department::query()->pluck('id', 'code');
        $custodian = User::query()->where('role', UserRole::ItStaff)->firstOrFail();

        // Infrastructure stays with IT; everything else rotates through the departments
        // so each one owns a slice of the register.
        $blueprints = [
            ['category' => 'Laptop', 'name' => 'Dell Latitude 5420', 'brand' => 'Dell', 'count' => 10],
            ['category' => 'Laptop', 'name' => 'Lenovo ThinkPad E14', 'brand' => 'Lenovo', 'count' => 6],
            ['category' => 'Desktop', 'name' => 'HP ProDesk 400 G7', 'brand' => 'HP', 'count' => 10],
            ['category' => 'Monitor', 'name' => 'Acer 24" LED Monitor', 'brand' => 'Acer', 'count' => 8],
            ['category' => 'Printer', 'name' => 'Epson L3210 EcoTank', 'brand' => 'Epson', 'count' => 4],
            ['category' => 'Networking Device', 'name' => 'Cisco Catalyst 1000 Switch', 'brand' => 'Cisco', 'count' => 3, 'department' => 'IT'],
            ['category' => 'Server', 'name' => 'Dell PowerEdge T40', 'brand' => 'Dell', 'count' => 2, 'department' => 'IT'],
            ['category' => 'Peripheral', 'name' => 'Logitech Wireless Keyboard', 'brand' => 'Logitech', 'count' => 5],
        ];

        $rotatingDepartmentIds = $departments->values()->all();

        foreach ($blueprints as $blueprint) {
            $factory = Asset::factory()
                ->count($blueprint['count'])
                ->state([
                    'asset_category_id' => $categories[$blueprint['category']],
                    'name' => $blueprint['name'],
                    'brand' => $blueprint['brand'],
                ]);

            $factory = isset($blueprint['department'])
                ? $factory->state(['department_id' => $departments[$blueprint['department']]])
                : $factory->sequence(fn ($sequence) => [
                    'department_id' => $rotatingDepartmentIds[$sequence->index % count($rotatingDepartmentIds)],
                ]);

            $factory->create();
        }

        Asset::factory()
            ->count(3)
            ->retired()
            ->state([
                'asset_category_id' => $categories['Desktop'],
                'name' => 'HP Compaq Pro 6300',
                'brand' => 'HP',
                'department_id' => $departments['IT'],
            ])
            ->create();

        $this->issueAssetsToEmployees($custodian);
    }

    /**
     * Hand a slice of the register to employees so custody history is not empty.
     *
     * Each employee receives hardware their own department is accountable for, which keeps
     * the department views consistent with the custody records.
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
            $asset = Asset::query()
                ->whereIn('asset_category_id', $issuableCategoryIds)
                ->where('department_id', $employee->department_id)
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
