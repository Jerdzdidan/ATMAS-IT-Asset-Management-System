<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Seed one account per role plus a pool of employees who can hold assets.
     */
    public function run(): void
    {
        $departmentIdsByCode = Department::query()->pluck('id', 'code');

        $accounts = [
            [
                'name' => 'System Administrator',
                'email' => 'admin@gmail.com',
                'role' => UserRole::Admin,
                'employee_code' => '21-00001',
                'position' => 'IT Manager',
                'department' => 'IT',
            ],
            [
                'name' => 'Ivan Torres',
                'email' => 'itstaff@gmail.com',
                'role' => UserRole::ItStaff,
                'employee_code' => '21-00002',
                'position' => 'IT Support Specialist',
                'department' => 'IT',
            ],
            [
                'name' => 'Marisol Cruz',
                'email' => 'depthead@gmail.com',
                'role' => UserRole::DepartmentHead,
                'employee_code' => '21-00004',
                'position' => 'Accounting Manager',
                'department' => 'ACCT',
            ],
            [
                'name' => 'Rogelio Villanueva',
                'email' => 'management@gmail.com',
                'role' => UserRole::Management,
                'employee_code' => '20-00005',
                'position' => 'Chief Operating Officer',
                'department' => 'ADMIN',
            ],
            [
                'name' => 'Cecilia Bautista',
                'email' => 'auditor@gmail.com',
                'role' => UserRole::Auditor,
                'employee_code' => '22-00006',
                'position' => 'Internal Auditor',
                'department' => 'ADMIN',
            ],
            [
                'name' => 'Elena Ramos',
                'email' => 'employee@gmail.com',
                'role' => UserRole::Employee,
                'employee_code' => '22-00003',
                'position' => 'Accounting Assistant',
                'department' => 'ACCT',
            ],
        ];

        foreach ($accounts as $account) {
            $departmentCode = $account['department'];
            unset($account['department']);

            User::query()->updateOrCreate(
                ['email' => $account['email']],
                [
                    ...$account,
                    'password' => Hash::make('password'),
                    'department_id' => $departmentIdsByCode[$departmentCode] ?? null,
                    'email_verified_at' => now(),
                    'status' => 'ACTIVE',
                ],
            );
        }

        $departmentIds = $departmentIdsByCode->values()->all();

        User::factory()
            ->count(12)
            ->sequence(fn ($sequence) => [
                'department_id' => $departmentIds[$sequence->index % count($departmentIds)],
                'employee_code' => sprintf('23-%05d', $sequence->index + 100),
            ])
            ->create();
    }
}
