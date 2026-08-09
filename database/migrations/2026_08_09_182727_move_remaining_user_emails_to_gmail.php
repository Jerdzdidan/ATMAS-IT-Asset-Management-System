<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Put every account on the same mail domain as the rest of the register.
     *
     * The seeded employees were given one of Faker's reserved example domains, under a local part
     * with no relation to the name beside it. Re-seeding would fix them but would take the whole
     * register with it, so the accounts already on file are rewritten in place instead.
     *
     * The address is rebuilt here rather than shared with UserSeeder on purpose: a migration has
     * to keep producing the same result years from now, whatever the seeder has become since.
     */
    public function up(): void
    {
        $ignored = [
            'mr', 'mrs', 'ms', 'miss', 'dr', 'prof',
            'jr', 'sr', 'i', 'ii', 'iii', 'iv', 'v', 'md', 'dds', 'phd', 'dvm',
        ];

        $taken = DB::table('users')->pluck('email')->all();

        foreach (DB::table('users')->where('email', 'not like', '%@gmail.com')->get() as $user) {
            $local = collect(explode(' ', (string) $user->name))
                ->map(fn (string $part): string => Str::slug($part))
                ->reject(fn (string $part): bool => $part === '' || in_array($part, $ignored, true))
                ->implode('.');

            if ($local === '') {
                continue;
            }

            $candidate = $local.'@gmail.com';
            $suffix = 1;

            while (in_array($candidate, $taken, true)) {
                $candidate = $local.++$suffix.'@gmail.com';
            }

            $taken[] = $candidate;

            DB::table('users')->where('id', $user->id)->update(['email' => $candidate]);
        }
    }

    /**
     * Deliberately empty: the addresses these replaced were generated at random and were never
     * anybody's, so there is nothing meaningful to restore them to.
     */
    public function down(): void {}
};
