<?php

namespace App\Models;

use App\Models\Concerns\RecordsActivity;
use Database\Factories\AssetCategoryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssetCategory extends Model
{
    /** @use HasFactory<AssetCategoryFactory> */
    use HasFactory, RecordsActivity;

    /** @var list<string> */
    protected $fillable = ['name', 'code', 'description'];

    /** @return HasMany<Asset, $this> */
    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class);
    }
}
