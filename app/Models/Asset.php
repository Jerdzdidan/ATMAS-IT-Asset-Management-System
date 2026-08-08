<?php

namespace App\Models;

use App\Enums\AssetCondition;
use App\Enums\AssetStatus;
use App\Models\Concerns\RecordsActivity;
use App\Services\AssetTagGenerator;
use Database\Factories\AssetFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Asset extends Model
{
    /** @use HasFactory<AssetFactory> */
    use HasFactory, RecordsActivity;

    /** @var list<string> */
    protected $fillable = [
        'asset_tag',
        'name',
        'asset_category_id',
        'department_id',
        'brand',
        'model',
        'serial_number',
        'location',
        'status',
        'condition',
        'purchase_date',
        'warranty_expires_at',
        'purchase_cost',
        'remarks',
    ];

    /** @var array<string, mixed> */
    protected $attributes = [
        'status' => AssetStatus::Available->value,
        'condition' => AssetCondition::Good->value,
    ];

    /**
     * Register the model's event listeners.
     *
     * Tagging lives here rather than in the controller so every entry point — the register
     * form, seeders, factories, and any later spreadsheet import — produces the same format.
     * A caller that already knows the tag, such as a legacy import, keeps the one it supplies.
     */
    protected static function booted(): void
    {
        static::creating(function (Asset $asset): void {
            if (filled($asset->asset_tag)) {
                return;
            }

            $category = $asset->category()->first();

            if ($category === null) {
                return;
            }

            $asset->asset_tag = app(AssetTagGenerator::class)->generate(
                $category,
                $asset->purchase_date?->year,
            );
        });
    }

    /** @return BelongsTo<AssetCategory, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(AssetCategory::class, 'asset_category_id');
    }

    /**
     * The department accountable for the asset, independent of who currently holds it.
     *
     * @return BelongsTo<Department, $this>
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /** @return HasMany<AssetAssignment, $this> */
    public function assignments(): HasMany
    {
        return $this->hasMany(AssetAssignment::class);
    }

    /**
     * The custody record for the employee currently holding the asset.
     *
     * @return HasOne<AssetAssignment, $this>
     */
    public function currentAssignment(): HasOne
    {
        return $this->hasOne(AssetAssignment::class)->whereNull('returned_at');
    }

    /** @return HasMany<MaintenanceRequest, $this> */
    public function maintenanceRequests(): HasMany
    {
        return $this->hasMany(MaintenanceRequest::class);
    }

    /** @return HasMany<MaintenanceSchedule, $this> */
    public function maintenanceSchedules(): HasMany
    {
        return $this->hasMany(MaintenanceSchedule::class);
    }

    /** @return HasMany<AssetPhoto, $this> */
    public function photos(): HasMany
    {
        return $this->hasMany(AssetPhoto::class);
    }

    /**
     * The single photo used as the asset's thumbnail across the register and labels.
     *
     * @return HasOne<AssetPhoto, $this>
     */
    public function primaryPhoto(): HasOne
    {
        return $this->hasOne(AssetPhoto::class)->where('is_primary', true);
    }

    /**
     * Limit the query to assets currently held by the given employee.
     *
     * @param  Builder<Asset>  $query
     */
    public function scopeHeldBy(Builder $query, int $userId): void
    {
        $query->whereHas('currentAssignment', fn (Builder $assignment) => $assignment->where('user_id', $userId));
    }

    /**
     * Limit the query to the assets the given user is allowed to see.
     *
     * Department heads are confined to their own department; a head without one sees nothing,
     * which is safer than falling back to the whole register.
     *
     * @param  Builder<Asset>  $query
     */
    public function scopeVisibleTo(Builder $query, User $user): void
    {
        if (! $user->isDepartmentScoped()) {
            return;
        }

        $query->whereNotNull('department_id')->where('department_id', $user->department_id);
    }

    /**
     * Determine whether the given user is allowed to open this asset record.
     */
    public function isVisibleTo(User $user): bool
    {
        if (! $user->isDepartmentScoped()) {
            return true;
        }

        return $this->department_id !== null && $this->department_id === $user->department_id;
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'status' => AssetStatus::class,
            'condition' => AssetCondition::class,
            // Serialized as plain calendar dates so the date inputs bind directly.
            'purchase_date' => 'date:Y-m-d',
            'warranty_expires_at' => 'date:Y-m-d',
            'purchase_cost' => 'decimal:2',
        ];
    }
}
