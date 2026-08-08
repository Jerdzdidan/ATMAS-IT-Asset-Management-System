<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    /**
     * Seed the departments that own hardware across the organization.
     */
    public function run(): void
    {
        $departments = [
            ['name' => 'Information Technology', 'code' => 'IT'],
            ['name' => 'Accounting', 'code' => 'ACCT'],
            ['name' => 'Human Resources', 'code' => 'HR'],
            ['name' => 'Production', 'code' => 'PROD'],
            ['name' => 'Sales and Marketing', 'code' => 'SALES'],
            ['name' => 'Administration', 'code' => 'ADMIN'],
        ];

        foreach ($departments as $department) {
            Department::query()->firstOrCreate(['code' => $department['code']], $department);
        }
    }
}
