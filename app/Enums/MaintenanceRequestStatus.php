<?php

namespace App\Enums;

enum MaintenanceRequestStatus: string
{
    case Pending = 'PENDING';
    case InProgress = 'IN_PROGRESS';
    case Resolved = 'RESOLVED';
    case Rejected = 'REJECTED';

    /**
     * Determine whether the request has reached a terminal state.
     */
    public function isClosed(): bool
    {
        return in_array($this, [self::Resolved, self::Rejected], true);
    }
}
