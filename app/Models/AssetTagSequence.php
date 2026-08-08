<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AssetTagSequence extends Model
{
    /** @var list<string> */
    protected $fillable = ['category_code', 'year', 'next_number'];

    /** @var array<string, mixed> */
    protected $attributes = ['next_number' => 1];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'next_number' => 'integer',
        ];
    }
}
