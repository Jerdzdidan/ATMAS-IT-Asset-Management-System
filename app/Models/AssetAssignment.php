<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetAssignment extends Model
{
    /** @var list<string> */
    protected $fillable = [
        'asset_id',
        'user_id',
        'assigned_by_id',
        'returned_by_id',
        'assigned_at',
        'returned_at',
        'notes',
        'return_notes',
    ];

    /** @return BelongsTo<Asset, $this> */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<User, $this> */
    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by_id');
    }

    /** @return BelongsTo<User, $this> */
    public function returnedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'returned_by_id');
    }

    /**
     * Determine whether the asset is still in the employee's custody.
     */
    public function isActive(): bool
    {
        return $this->returned_at === null;
    }

    /**
     * Limit the query to custody records that have not been returned yet.
     *
     * @param  Builder<AssetAssignment>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $query->whereNull('returned_at');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'assigned_at' => 'datetime',
            'returned_at' => 'datetime',
        ];
    }
}
