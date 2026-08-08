<?php

namespace App\Enums;

enum AuditEvent: string
{
    case Created = 'CREATED';
    case Updated = 'UPDATED';
    case Deleted = 'DELETED';
    case Issued = 'ISSUED';
    case Returned = 'RETURNED';
    case Retired = 'RETIRED';
    case Restored = 'RESTORED';
    case Serviced = 'SERVICED';
    case Imported = 'IMPORTED';
    case Exported = 'EXPORTED';
    case LoggedIn = 'LOGGED_IN';
    case LoggedOut = 'LOGGED_OUT';

    public function label(): string
    {
        return match ($this) {
            self::Created => 'Created',
            self::Updated => 'Updated',
            self::Deleted => 'Deleted',
            self::Issued => 'Issued',
            self::Returned => 'Returned',
            self::Retired => 'Retired',
            self::Restored => 'Restored',
            self::Serviced => 'Serviced',
            self::Imported => 'Imported',
            self::Exported => 'Exported',
            self::LoggedIn => 'Signed in',
            self::LoggedOut => 'Signed out',
        };
    }
}
