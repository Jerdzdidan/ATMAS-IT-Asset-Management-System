<?php

namespace App\Enums;

enum AssetCondition: string
{
    case New = 'NEW';
    case Good = 'GOOD';
    case Fair = 'FAIR';
    case Poor = 'POOR';
}
