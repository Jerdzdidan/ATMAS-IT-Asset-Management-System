<?php

namespace App\Models;

use App\Enums\MaintenanceFrequency;
use App\Models\Concerns\RecordsActivity;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceSchedule extends Model
{
    use RecordsActivity;

    /** @var list<string> */
    protected $fillable = [
        'asset_id',
        'title',
        'frequency',
        'next_due_on',
        'last_completed_on',
        'instructions',
        'is_active',
    ];

    /** @var array<string, mixed> */
    protected $attributes = ['is_active' => true];

    /** @var list<string> */
    protected $appends = ['is_overdue', 'days_until_due'];

    /** @return BelongsTo<Asset, $this> */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    /**
     * Roll the plan forward after a service was carried out.
     *
     * The next date is counted from today rather than from the date that was missed, so an
     * overdue plan does not immediately fall due again the moment it is serviced.
     */
    public function recordService(): void
    {
        $servicedOn = now()->startOfDay();

        $this->update([
            'last_completed_on' => $servicedOn->toDateString(),
            'next_due_on' => $this->frequency->advance($servicedOn)->toDateString(),
        ]);
    }

    /**
     * Determine whether the plan has passed its due date without being serviced.
     *
     * Compared against the start of today, not the current moment: a plan due today still has
     * the day to run, which is also how the overdue queries count it.
     */
    public function getIsOverdueAttribute(): bool
    {
        return $this->is_active && $this->next_due_on !== null && $this->next_due_on->lt(now()->startOfDay());
    }

    /**
     * How many days remain before the next service, negative once it is overdue.
     */
    public function getDaysUntilDueAttribute(): ?int
    {
        return $this->next_due_on === null
            ? null
            : (int) now()->startOfDay()->diffInDays($this->next_due_on, false);
    }

    /**
     * Limit the query to plans that are due on or before the given horizon.
     *
     * @param  Builder<MaintenanceSchedule>  $query
     */
    public function scopeDueWithinDays(Builder $query, int $days): void
    {
        $query->where('is_active', true)->whereDate('next_due_on', '<=', now()->addDays($days)->toDateString());
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'frequency' => MaintenanceFrequency::class,
            'next_due_on' => 'date:Y-m-d',
            'last_completed_on' => 'date:Y-m-d',
            'is_active' => 'boolean',
        ];
    }
}
