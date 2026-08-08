<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class AssetPhoto extends Model
{
    /** @var list<string> */
    protected $fillable = [
        'asset_id',
        'uploaded_by_id',
        'path',
        'original_name',
        'size_bytes',
        'caption',
        'is_primary',
    ];

    /** @var list<string> */
    protected $appends = ['url'];

    /** @return BelongsTo<Asset, $this> */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    /** @return BelongsTo<User, $this> */
    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_id');
    }

    /**
     * The public URL the browser loads the image from.
     */
    public function getUrlAttribute(): string
    {
        return Storage::disk('public')->url($this->path);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'is_primary' => 'boolean',
            'size_bytes' => 'integer',
        ];
    }
}
