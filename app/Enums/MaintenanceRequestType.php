<?php

namespace App\Enums;

enum MaintenanceRequestType: string
{
    case Repair = 'REPAIR';
    case Preventive = 'PREVENTIVE';
    case Replacement = 'REPLACEMENT';
}
