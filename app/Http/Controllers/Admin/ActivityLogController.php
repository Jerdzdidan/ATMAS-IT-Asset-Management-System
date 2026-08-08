<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AuditEvent;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ActivityLogController extends Controller
{
    /**
     * The newest entries loaded in one page of the trail.
     *
     * The trail grows without bound, so the window is capped and the filters run in the
     * database rather than in the browser.
     */
    private const WINDOW = 400;

    /**
     * Display the audit trail.
     */
    public function index(Request $request): Response
    {
        $filters = [
            'event' => $request->string('event')->toString() ?: 'ALL',
            'from' => $request->date('from')?->toDateString(),
            'to' => $request->date('to')?->toDateString(),
            'search' => $request->string('search')->toString(),
        ];

        $entries = ActivityLog::query()
            ->with('user:id,name,employee_code')
            ->visibleTo($request->user())
            ->when($filters['event'] !== 'ALL', fn (Builder $query) => $query->where('event', $filters['event']))
            ->when($filters['from'], fn (Builder $query, string $from) => $query->whereDate('created_at', '>=', $from))
            ->when($filters['to'], fn (Builder $query, string $to) => $query->whereDate('created_at', '<=', $to))
            ->when($filters['search'], function (Builder $query, string $search): void {
                $query->where(function (Builder $match) use ($search): void {
                    $match->where('description', 'like', "%{$search}%")
                        ->orWhere('subject_label', 'like', "%{$search}%")
                        ->orWhere('actor_name', 'like', "%{$search}%");
                });
            })
            ->latest('id')
            ->limit(self::WINDOW)
            ->get();

        return Inertia::render('admin/activity-log', [
            'entries' => $entries,
            'filters' => $filters,
            'eventOptions' => collect(AuditEvent::cases())
                ->map(fn (AuditEvent $event): array => ['value' => $event->value, 'label' => $event->label()])
                ->all(),
            'windowSize' => self::WINDOW,
            'isTruncated' => $entries->count() === self::WINDOW,
        ]);
    }
}
