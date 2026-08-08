<?php

namespace App\Models;

use App\Enums\AuditEvent;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One immutable entry in the audit trail.
 *
 * Entries are never updated after they are written, so the table carries `created_at` alone.
 */
class ActivityLog extends Model
{
    public const UPDATED_AT = null;

    /** @var list<string> */
    protected $fillable = [
        'user_id',
        'actor_name',
        'event',
        'subject_type',
        'subject_id',
        'subject_label',
        'description',
        'properties',
        'ip_address',
    ];

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Limit the trail to the entries the given user is allowed to read.
     *
     * A department head only ever audits their own hardware, so they see asset entries for
     * their department plus anything they did themselves.
     *
     * @param  Builder<ActivityLog>  $query
     */
    public function scopeVisibleTo(Builder $query, User $user): void
    {
        if (! $user->isDepartmentScoped()) {
            return;
        }

        $visibleAssetIds = Asset::query()->visibleTo($user)->select('id');

        $query->where(function (Builder $entry) use ($user, $visibleAssetIds): void {
            $entry->where('user_id', $user->id)
                ->orWhere(function (Builder $subject) use ($visibleAssetIds): void {
                    $subject->where('subject_type', 'Asset')->whereIn('subject_id', $visibleAssetIds);
                });
        });
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'event' => AuditEvent::class,
            'properties' => 'array',
            'created_at' => 'datetime',
        ];
    }
}
