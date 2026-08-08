import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime } from '@/lib/format';
import { type AuditEventType, type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { RotateCcw } from 'lucide-react';
import { useState } from 'react';

interface ActivityEntry {
    id: number;
    actor_name: string | null;
    event: AuditEventType;
    subject_type: string | null;
    subject_id: number | null;
    subject_label: string | null;
    description: string;
    properties: { changes?: Record<string, { from: string | null; to: string | null }> } | null;
    ip_address: string | null;
    created_at: string;
    user: { id: number; name: string; employee_code: string | null } | null;
}

interface LogsPageProps {
    entries: ActivityEntry[];
    filters: { event: string; from: string | null; to: string | null; search: string };
    eventOptions: { value: AuditEventType; label: string }[];
    windowSize: number;
    isTruncated: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Logs', href: '/admin/logs' },
];

/** Destructive events stand out; routine reads and writes stay quiet. */
const eventVariants: Partial<Record<AuditEventType, 'success' | 'info' | 'warning' | 'danger' | 'neutral'>> = {
    CREATED: 'success',
    UPDATED: 'info',
    DELETED: 'danger',
    ISSUED: 'info',
    RETURNED: 'info',
    RETIRED: 'warning',
    RESTORED: 'success',
    SERVICED: 'success',
    IMPORTED: 'warning',
    EXPORTED: 'neutral',
    LOGGED_IN: 'neutral',
    LOGGED_OUT: 'neutral',
};

/** Turn a stored column name into something an auditor can read. */
function humanizeField(field: string): string {
    return field.replace(/_id$/, '').replace(/_/g, ' ');
}

export default function LogsPage({ entries, filters, eventOptions, windowSize, isTruncated }: LogsPageProps) {
    const [draft, setDraft] = useState({
        event: filters.event,
        from: filters.from ?? '',
        to: filters.to ?? '',
        search: filters.search,
    });

    function apply(next: Partial<typeof draft>): void {
        const merged = { ...draft, ...next };
        setDraft(merged);
        router.get('/admin/logs', merged, { preserveState: true, preserveScroll: true, replace: true });
    }

    function reset(): void {
        const cleared = { event: 'ALL', from: '', to: '', search: '' };
        setDraft(cleared);
        router.get('/admin/logs', {}, { preserveState: true, preserveScroll: true, replace: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Logs" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Logs</h1>
                    <p className="text-muted-foreground">
                        Every change to the register, with the account that made it. Entries are written automatically and cannot be edited.
                    </p>
                </div>

                <div className="bg-card grid gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="space-y-2 lg:col-span-2">
                        <Label htmlFor="log-search">Search</Label>
                        <Input
                            id="log-search"
                            value={draft.search}
                            placeholder="Asset tag, description, or person"
                            onChange={(event) => setDraft({ ...draft, search: event.target.value })}
                            onKeyDown={(event) => event.key === 'Enter' && apply({})}
                            onBlur={() => apply({})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Event</Label>
                        <Select value={draft.event} onValueChange={(value) => apply({ event: value })}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All events</SelectItem>
                                {eventOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="log-from">From</Label>
                        <Input id="log-from" type="date" value={draft.from} onChange={(event) => apply({ from: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="log-to">To</Label>
                        <div className="flex gap-2">
                            <Input id="log-to" type="date" value={draft.to} onChange={(event) => apply({ to: event.target.value })} />
                            <Button type="button" variant="outline" size="icon" aria-label="Reset filters" onClick={reset}>
                                <RotateCcw />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-44">When</TableHead>
                                <TableHead className="w-32">Event</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="w-40">Changes</TableHead>
                                <TableHead className="w-40">Performed by</TableHead>
                                <TableHead className="w-28">IP</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                                        No activity matches these filters.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                entries.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell className="text-muted-foreground text-xs">{formatDateTime(entry.created_at)}</TableCell>
                                        <TableCell>
                                            <Badge variant={eventVariants[entry.event] ?? 'neutral'}>
                                                {eventOptions.find((option) => option.value === entry.event)?.label ?? entry.event}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-medium">{entry.description}</p>
                                            {entry.subject_type && (
                                                <p className="text-muted-foreground text-xs">
                                                    {entry.subject_type}
                                                    {entry.subject_label ? ` · ${entry.subject_label}` : ''}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {entry.properties?.changes
                                                ? Object.entries(entry.properties.changes).map(([field, change]) => (
                                                      <div key={field}>
                                                          <span className="font-medium">{humanizeField(field)}:</span> {change.from ?? '—'} →{' '}
                                                          {change.to ?? '—'}
                                                      </div>
                                                  ))
                                                : '—'}
                                        </TableCell>
                                        <TableCell className="text-sm">{entry.actor_name ?? 'System'}</TableCell>
                                        <TableCell className="text-muted-foreground text-xs">{entry.ip_address ?? '—'}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <p className="text-muted-foreground text-xs">
                    {isTruncated
                        ? `Showing the most recent ${windowSize} entries. Narrow the date range to reach older activity.`
                        : `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} shown.`}
                </p>
            </div>
        </AppLayout>
    );
}
