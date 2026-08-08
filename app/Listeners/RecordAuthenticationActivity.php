<?php

namespace App\Listeners;

use App\Enums\AuditEvent;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;

/**
 * Records sign-in and sign-out against the audit trail.
 *
 * Auditors asked for a trail that answers "who was in the system, and when", which the model
 * hooks alone cannot supply because a session that only reads records changes nothing.
 */
class RecordAuthenticationActivity
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function handleLogin(Login $event): void
    {
        if (! $event->user instanceof User) {
            return;
        }

        $this->auditLogger->record(
            AuditEvent::LoggedIn,
            description: $event->user->name.' signed in',
            actor: $event->user,
        );
    }

    public function handleLogout(Logout $event): void
    {
        // A guest logout carries no account, and there is nothing worth recording.
        if (! $event->user instanceof User) {
            return;
        }

        $this->auditLogger->record(
            AuditEvent::LoggedOut,
            description: $event->user->name.' signed out',
            actor: $event->user,
        );
    }
}
