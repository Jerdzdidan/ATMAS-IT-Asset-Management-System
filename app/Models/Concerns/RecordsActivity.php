<?php

namespace App\Models\Concerns;

use App\Enums\AuditEvent;
use App\Services\AuditLogger;
use Illuminate\Database\Eloquent\Model;

/**
 * Writes an audit entry whenever the model is created, changed, or removed.
 *
 * Hooking the model rather than the controller means an edit made from a seeder, a
 * spreadsheet import, or a future console command is recorded on exactly the same terms.
 */
trait RecordsActivity
{
    public static function bootRecordsActivity(): void
    {
        static::created(function (Model $model): void {
            app(AuditLogger::class)->recordModelChange(AuditEvent::Created, $model);
        });

        static::updated(function (Model $model): void {
            app(AuditLogger::class)->recordModelChange(AuditEvent::Updated, $model);
        });

        static::deleted(function (Model $model): void {
            app(AuditLogger::class)->recordModelChange(AuditEvent::Deleted, $model);
        });
    }
}
