<?php

namespace Database\Factories;

use App\Enums\UserRole;
use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'role' => UserRole::Employee,
            'employee_code' => fake()->unique()->numerify('##-#####'),
            'department_id' => Department::factory(),
            'position' => fake()->jobTitle(),
            'contact_number' => fake()->numerify('09#########'),
            'status' => 'ACTIVE',
        ];
    }

    /**
     * Indicate that the account has full administrative access.
     */
    public function admin(): static
    {
        return $this->state(fn (array $attributes) => ['role' => UserRole::Admin]);
    }

    /**
     * Indicate that the account belongs to the IT support team.
     */
    public function itStaff(): static
    {
        return $this->state(fn (array $attributes) => ['role' => UserRole::ItStaff]);
    }

    /**
     * Indicate that the account oversees the hardware of a single department.
     */
    public function departmentHead(): static
    {
        return $this->state(fn (array $attributes) => ['role' => UserRole::DepartmentHead]);
    }

    /**
     * Indicate that the account reviews summaries without editing records.
     */
    public function management(): static
    {
        return $this->state(fn (array $attributes) => ['role' => UserRole::Management]);
    }

    /**
     * Indicate that the account has read-only access to the inventory records.
     */
    public function auditor(): static
    {
        return $this->state(fn (array $attributes) => ['role' => UserRole::Auditor]);
    }

    /**
     * Indicate that the account can no longer sign in or receive assets.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => ['status' => 'INACTIVE']);
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
