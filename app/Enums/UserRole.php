<?php

namespace App\Enums;

enum UserRole: string
{
    case SuperAdmin = 'SUPER_ADMIN';
    case ItStaff = 'IT_STAFF';
    case DepartmentHead = 'DEPARTMENT_HEAD';
    case Management = 'MANAGEMENT';
    case Auditor = 'AUDITOR';
    case Employee = 'EMPLOYEE';

    /**
     * Determine whether the role may register, assign, and retire assets.
     */
    public function managesAssets(): bool
    {
        return in_array($this, [self::SuperAdmin, self::ItStaff], true);
    }

    /**
     * Determine whether the role may maintain accounts, departments, and system settings.
     */
    public function managesUsers(): bool
    {
        return $this === self::SuperAdmin;
    }

    /**
     * Determine whether the role may read the hardware register and the repair queue.
     *
     * Employees are excluded: they only ever see the assets in their own custody.
     */
    public function viewsRegister(): bool
    {
        return $this !== self::Employee;
    }

    /**
     * Determine whether the role only sees the records belonging to its own department.
     */
    public function isDepartmentScoped(): bool
    {
        return $this === self::DepartmentHead;
    }

    public function label(): string
    {
        return match ($this) {
            self::SuperAdmin => 'Super Administrator',
            self::ItStaff => 'Administrator (IT Staff)',
            self::DepartmentHead => 'Department Head',
            self::Management => 'Management',
            self::Auditor => 'Auditor',
            self::Employee => 'Employee',
        };
    }

    /**
     * A one-line summary of the access the role grants, shown when assigning it.
     */
    public function description(): string
    {
        return match ($this) {
            self::SuperAdmin => 'Full access to every module, user management, and settings.',
            self::ItStaff => 'Manages assets, records, inventory operations, and the repair queue.',
            self::DepartmentHead => 'Views the assets allocated to their own department.',
            self::Management => 'Views dashboards and summaries without editing records.',
            self::Auditor => 'Read-only access to the inventory records.',
            self::Employee => 'Views only the assets issued to them.',
        };
    }
}
