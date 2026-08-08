<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Determine whether the user has unrestricted access to every module.
     */
    public function isSuperAdmin(): bool
    {
        return $this->role === UserRole::SuperAdmin;
    }

    /**
     * Determine whether the user may register, assign, and retire assets.
     */
    public function managesAssets(): bool
    {
        return $this->role->managesAssets();
    }

    /**
     * Determine whether the user may maintain accounts, departments, and settings.
     */
    public function managesUsers(): bool
    {
        return $this->role->managesUsers();
    }

    /**
     * Determine whether the user may read the hardware register and the repair queue.
     */
    public function viewsRegister(): bool
    {
        return $this->role->viewsRegister();
    }

    /**
     * Determine whether the user only sees the records of their own department.
     */
    public function isDepartmentScoped(): bool
    {
        return $this->role->isDepartmentScoped();
    }

    /**
     * Determine whether the account is allowed to sign in.
     */
    public function isActive(): bool
    {
        return $this->status === 'ACTIVE';
    }

    /** @return BelongsTo<Department, $this> */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /** @return HasMany<AssetAssignment, $this> */
    public function assetAssignments(): HasMany
    {
        return $this->hasMany(AssetAssignment::class);
    }

    /**
     * The custody record for the asset the employee is currently holding, if any.
     *
     * @return HasOne<AssetAssignment, $this>
     */
    public function currentAssetAssignment(): HasOne
    {
        return $this->hasOne(AssetAssignment::class)->whereNull('returned_at');
    }

    /** @return HasMany<MaintenanceRequest, $this> */
    public function maintenanceRequests(): HasMany
    {
        return $this->hasMany(MaintenanceRequest::class, 'requested_by_id');
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'employee_code',
        'department_id',
        'position',
        'contact_number',
        'status',
    ];

    /** @var array<string, mixed> */
    protected $attributes = [
        'role' => UserRole::Employee->value,
        'status' => 'ACTIVE',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
        ];
    }
}
