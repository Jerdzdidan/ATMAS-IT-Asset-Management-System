<?php

namespace App\Services;

use App\Enums\AuditEvent;
use App\Models\ActivityLog;
use App\Models\User;
use BackedEnum;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;
use Illuminate\Support\Str;

/**
 * Writes the audit trail.
 *
 * Every entry captures the actor's name as text alongside the foreign key, so the trail still
 * reads correctly after the account that produced it is removed.
 */
class AuditLogger
{
    /**
     * Attributes that must never reach the trail, whatever model they appear on.
     *
     * @var list<string>
     */
    private const REDACTED = ['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'];

    /**
     * Attributes that change on almost every save and would drown the diff.
     *
     * @var list<string>
     */
    private const NOISE = ['updated_at', 'created_at'];

    /**
     * Whether model hooks are currently writing to the trail.
     */
    private static bool $recording = true;

    /**
     * Run the callback without writing anything to the trail.
     *
     * Used when bulk-loading demo or reference data, where one entry per inserted row would
     * bury the entries that describe real operator activity.
     */
    public static function withoutRecording(callable $callback): mixed
    {
        self::$recording = false;

        try {
            return $callback();
        } finally {
            self::$recording = true;
        }
    }

    /**
     * Write one entry to the trail.
     *
     * The actor defaults to whoever is signed in; sign-out is the one case that has to name
     * the account explicitly, because the session is already being torn down.
     *
     * @param  array<string, mixed>  $properties
     */
    public function record(
        AuditEvent $event,
        ?Model $subject = null,
        ?string $description = null,
        array $properties = [],
        ?User $actor = null,
    ): void {
        if (! self::$recording) {
            return;
        }

        $actor ??= Auth::user();

        ActivityLog::create([
            'user_id' => $actor?->id,
            'actor_name' => $actor?->name ?? 'System',
            'event' => $event,
            'subject_type' => $subject === null ? null : class_basename($subject),
            'subject_id' => $subject?->getKey(),
            'subject_label' => $subject === null ? null : $this->labelFor($subject),
            'description' => $description ?? $this->describe($event, $subject),
            'properties' => $properties === [] ? null : $properties,
            'ip_address' => Request::ip(),
        ]);
    }

    /**
     * Write an entry for a model lifecycle event, attaching the before/after diff on updates.
     */
    public function recordModelChange(AuditEvent $event, Model $subject): void
    {
        $properties = $event === AuditEvent::Updated ? $this->changesFor($subject) : [];

        // An update that only touched redacted or noise columns is not worth an entry.
        if ($event === AuditEvent::Updated && $properties === []) {
            return;
        }

        $this->record($event, $subject, null, $properties);
    }

    /**
     * Build the field-by-field diff for an updated model.
     *
     * @return array<string, array<string, array{from: mixed, to: mixed}>>
     */
    private function changesFor(Model $subject): array
    {
        $original = $subject->getOriginal();
        $changes = [];

        foreach ($subject->getChanges() as $attribute => $value) {
            if (in_array($attribute, self::NOISE, true)) {
                continue;
            }

            if (in_array($attribute, self::REDACTED, true)) {
                $changes[$attribute] = ['from' => '••••••', 'to' => '••••••'];

                continue;
            }

            $changes[$attribute] = [
                'from' => $this->normalize($original[$attribute] ?? null),
                'to' => $this->normalize($value),
            ];
        }

        return $changes === [] ? [] : ['changes' => $changes];
    }

    /**
     * Reduce a stored value to something that survives a JSON round trip.
     */
    private function normalize(mixed $value): string|int|float|bool|null
    {
        return match (true) {
            $value instanceof BackedEnum => $value->value,
            $value instanceof DateTimeInterface => $value->format('Y-m-d H:i:s'),
            is_array($value) => json_encode($value) ?: null,
            is_scalar($value), $value === null => $value,
            default => (string) $value,
        };
    }

    /**
     * The human-readable name of the record the entry describes.
     */
    private function labelFor(Model $subject): string
    {
        foreach (['asset_tag', 'name', 'title', 'code'] as $attribute) {
            if (filled($subject->getAttribute($attribute))) {
                return (string) $subject->getAttribute($attribute);
            }
        }

        return class_basename($subject).' #'.$subject->getKey();
    }

    /**
     * The default sentence written when a caller does not supply one.
     */
    private function describe(AuditEvent $event, ?Model $subject): string
    {
        if ($subject === null) {
            return $event->label();
        }

        return sprintf('%s %s %s', $event->label(), Str::lower(Str::headline(class_basename($subject))), $this->labelFor($subject));
    }
}
