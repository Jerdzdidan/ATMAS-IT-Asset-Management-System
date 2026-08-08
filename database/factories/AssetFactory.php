<?php

namespace Database\Factories;

use App\Enums\AssetCondition;
use App\Enums\AssetStatus;
use App\Models\Asset;
use App\Models\AssetCategory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * @extends Factory<Asset>
 */
class AssetFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $purchaseDate = Carbon::instance(fake()->dateTimeBetween('-7 years', '-2 months'));

        // The asset tag is intentionally omitted; the model issues it from the category and year.
        return [
            'name' => fake()->randomElement(['Laptop', 'Desktop', 'Monitor', 'Printer', 'Network Switch']).' Unit',
            'asset_category_id' => AssetCategory::factory(),
            'brand' => fake()->randomElement(['Dell', 'HP', 'Lenovo', 'Acer', 'Asus', 'Epson', 'Cisco']),
            'model' => strtoupper(fake()->bothify('??-####')),
            'serial_number' => strtoupper(fake()->unique()->bothify('SN?????####')),
            'location' => fake()->randomElement(['Caloocan Plant', '11th Avenue, Caloocan', 'Project 6, Quezon City', 'Malolos, Bulacan']),
            'status' => AssetStatus::Available,
            'condition' => fake()->randomElement(AssetCondition::cases()),
            'purchase_date' => $purchaseDate,
            'warranty_expires_at' => $purchaseDate->copy()->addYears(fake()->numberBetween(1, 3)),
            'purchase_cost' => fake()->randomFloat(2, 3500, 95000),
            'remarks' => null,
        ];
    }

    /**
     * Indicate that the asset has been taken out of active service.
     */
    public function retired(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => AssetStatus::Retired,
            'condition' => AssetCondition::Poor,
        ]);
    }
}
