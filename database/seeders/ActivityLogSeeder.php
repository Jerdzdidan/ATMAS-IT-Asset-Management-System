<?php

namespace Database\Seeders;

use App\Enums\AuditEvent;
use App\Models\ActivityLog;
use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class ActivityLogSeeder extends Seeder
{
    /**
     * Backfill an audit trail that matches the data the other seeders produced.
     *
     * The rest of the seed run writes no entries at all — one line per inserted row would be
     * meaningless noise — so the trail is reconstructed here from the records that exist, with
     * plausible actors and timestamps spread over the past few months.
     */
    public function run(): void
    {
        $itStaff = User::query()->where('email', 'itstaff@atmas.test')->first();
        $superAdmin = User::query()->where('email', 'admin@atmas.test')->first();

        if ($itStaff === null || $superAdmin === null) {
            return;
        }

        $entries = collect();

        // Registration of each asset, dated to when it was acquired.
        foreach (Asset::query()->with('category:id,name')->get() as $asset) {
            $entries->push([
                'actor' => $itStaff,
                'event' => AuditEvent::Created,
                'subject' => $asset,
                'description' => "Created asset {$asset->asset_tag}",
                'at' => $asset->purchase_date?->copy()->addDays(2) ?? Carbon::now()->subMonths(6),
            ]);
        }

        // Custody handovers, matching the assignment records.
        foreach (AssetAssignment::query()->with(['asset:id,asset_tag', 'user:id,name'])->get() as $assignment) {
            $entries->push([
                'actor' => $itStaff,
                'event' => AuditEvent::Issued,
                'subject' => $assignment->asset,
                'description' => "Issued asset {$assignment->asset?->asset_tag} to {$assignment->user?->name}",
                'at' => $assignment->assigned_at ?? Carbon::now()->subMonth(),
            ]);
        }

        // Retirements, so the trail explains the assets that left the active pool.
        foreach (Asset::query()->where('status', 'RETIRED')->get() as $asset) {
            $entries->push([
                'actor' => $superAdmin,
                'event' => AuditEvent::Retired,
                'subject' => $asset,
                'description' => "Retired asset {$asset->asset_tag} at end of service life",
                'at' => Carbon::now()->subDays(fake()->numberBetween(10, 120)),
            ]);
        }

        // A handful of sign-ins so the trail is not made up of record changes alone.
        foreach (User::query()->whereNot('email', 'like', '%@example.%')->limit(6)->get() as $user) {
            $entries->push([
                'actor' => $user,
                'event' => AuditEvent::LoggedIn,
                'subject' => null,
                'description' => "{$user->name} signed in",
                'at' => Carbon::now()->subDays(fake()->numberBetween(0, 14))->setTime(fake()->numberBetween(7, 18), fake()->numberBetween(0, 59)),
            ]);
        }

        $rows = $entries
            ->sortBy(fn (array $entry): Carbon => $entry['at'])
            ->map(fn (array $entry): array => [
                'user_id' => $entry['actor']->id,
                'actor_name' => $entry['actor']->name,
                'event' => $entry['event']->value,
                'subject_type' => $entry['subject'] === null ? null : class_basename($entry['subject']),
                'subject_id' => $entry['subject']?->getKey(),
                'subject_label' => $entry['subject']?->asset_tag,
                'description' => $entry['description'],
                'properties' => null,
                'ip_address' => '127.0.0.1',
                'created_at' => $entry['at'],
            ])
            ->values()
            ->all();

        foreach (array_chunk($rows, 200) as $chunk) {
            ActivityLog::query()->insert($chunk);
        }
    }
}
