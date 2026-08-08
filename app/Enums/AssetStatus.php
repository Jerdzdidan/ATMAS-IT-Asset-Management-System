<?php

namespace App\Enums;

enum AssetStatus: string
{
    case Available = 'AVAILABLE';
    case Assigned = 'ASSIGNED';
    case UnderRepair = 'UNDER_REPAIR';
    case Retired = 'RETIRED';

    /**
     * Determine whether the asset may still be issued to an employee.
     */
    public function isIssuable(): bool
    {
        return $this === self::Available;
    }

    /**
     * Determine whether the asset has left the active inventory for good.
     */
    public function isRetired(): bool
    {
        return $this === self::Retired;
    }
}
