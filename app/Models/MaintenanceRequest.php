<?php

namespace App\Models;

use App\Enums\MaintenanceRequestStatus;
use App\Enums\MaintenanceRequestType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceRequest extends Model
{
    /** @var list<string> */
    protected $fillable = [
        'asset_id',
        'requested_by_id',
        'handled_by_id',
        'request_type',
        'issue_description',
        'status',
        'resolution_notes',
        'resolved_at',
    ];

    /** @var array<string, mixed> */
    protected $attributes = ['status' => MaintenanceRequestStatus::Pending->value];

    /** @return BelongsTo<Asset, $this> */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    /** @return BelongsTo<User, $this> */
    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_id');
    }

    /** @return BelongsTo<User, $this> */
    public function handledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by_id');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'request_type' => MaintenanceRequestType::class,
            'status' => MaintenanceRequestStatus::class,
            'resolved_at' => 'datetime',
        ];
    }
}
