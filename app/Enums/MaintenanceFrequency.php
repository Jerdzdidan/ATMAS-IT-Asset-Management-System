<?php

namespace App\Enums;

use Carbon\CarbonInterface;

enum MaintenanceFrequency: string
{
    case Monthly = 'MONTHLY';
    case Quarterly = 'QUARTERLY';
    case SemiAnnual = 'SEMI_ANNUAL';
    case Annual = 'ANNUAL';

    /**
     * The gap between two services in this cycle.
     */
    public function months(): int
    {
        return match ($this) {
            self::Monthly => 1,
            self::Quarterly => 3,
            self::SemiAnnual => 6,
            self::Annual => 12,
        };
    }

    /**
     * Move a due date forward by one full cycle.
     */
    public function advance(CarbonInterface $from): CarbonInterface
    {
        return $from->copy()->addMonthsNoOverflow($this->months());
    }

    public function label(): string
    {
        return match ($this) {
            self::Monthly => 'Monthly',
            self::Quarterly => 'Quarterly',
            self::SemiAnnual => 'Every 6 months',
            self::Annual => 'Annually',
        };
    }
}
