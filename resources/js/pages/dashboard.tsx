import { DashboardMasthead } from '@/components/dashboard-masthead';
import { DepartmentScopeNote } from '@/components/department-scope-note';
import { MaintenanceStatusBadge } from '@/components/status-badges';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatDateTime } from '@/lib/format';
import { type BreadcrumbItem, type MaintenanceRequestStatus, type MaintenanceSchedule } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { CalendarClock, CheckCircle2, HardDrive, PackageCheck, ShieldAlert, Wrench } from 'lucide-react';

interface DashboardPageProps {
    statistics: {
        total_assets: number;
        available: number;
        assigned: number;
        under_repair: number;
        retired: number;
        open_requests: number;
        overdue_maintenance: number;
        warranty_expiring: number;
    };
    generatedAt: string;
    upcomingMaintenance: MaintenanceSchedule[];
    recentAssignments: {
        id: number;
        assigned_at: string;
        asset: { id: number; asset_tag: string; name: string } | null;
        user: { id: number; name: string } | null;
    }[];
    recentRequests: {
        id: number;
        issue_description: string;
        status: MaintenanceRequestStatus;
        created_at: string;
        asset: { id: number; asset_tag: string; name: string } | null;
        requested_by: { id: number; name: string } | null;
    }[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/dashboard' }];

function StatCard({
    label,
    value,
    hint,
    icon: Icon,
    alert = false,
}: {
    label: string;
    value: number;
    hint: string;
    icon: typeof HardDrive;
    /** Draws attention when the figure is something someone has to act on. */
    alert?: boolean;
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon className={alert && value > 0 ? 'text-destructive size-4' : 'text-muted-foreground size-4'} />
            </CardHeader>
            <CardContent>
                <div className={alert && value > 0 ? 'text-destructive text-2xl font-bold' : 'text-2xl font-bold'}>{value}</div>
                <p className="text-muted-foreground text-xs">{hint}</p>
            </CardContent>
        </Card>
    );
}

/**
 * Name what is waiting, so the greeting says something the cards below do not already shout.
 */
function attentionSummary(statistics: DashboardPageProps['statistics']): string {
    const outstanding = [
        statistics.overdue_maintenance > 0 &&
            `${statistics.overdue_maintenance} overdue ${statistics.overdue_maintenance === 1 ? 'service' : 'services'}`,
        statistics.open_requests > 0 && `${statistics.open_requests} open ${statistics.open_requests === 1 ? 'ticket' : 'tickets'}`,
        statistics.warranty_expiring > 0 &&
            `${statistics.warranty_expiring} ${statistics.warranty_expiring === 1 ? 'warranty' : 'warranties'} ending soon`,
    ].filter((part): part is string => typeof part === 'string');

    if (outstanding.length === 0) {
        return `All ${statistics.total_assets} assets are accounted for, with nothing overdue and no open tickets.`;
    }

    const listed = outstanding.length === 1 ? outstanding[0] : `${outstanding.slice(0, -1).join(', ')} and ${outstanding[outstanding.length - 1]}`;

    return `You have ${listed} waiting.`;
}

export default function DashboardPage({ statistics, generatedAt, upcomingMaintenance, recentAssignments, recentRequests }: DashboardPageProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <DashboardMasthead summary={attentionSummary(statistics)} generatedAt={generatedAt} />
                <DepartmentScopeNote noun="figures" />

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                    <StatCard label="Total assets" value={statistics.total_assets} hint={`${statistics.retired} retired`} icon={HardDrive} />
                    <StatCard label="Available" value={statistics.available} hint="Ready to be issued" icon={CheckCircle2} />
                    <StatCard label="Assigned" value={statistics.assigned} hint="In employee custody" icon={PackageCheck} />
                    <StatCard label="Open requests" value={statistics.open_requests} hint={`${statistics.under_repair} under repair`} icon={Wrench} />
                    <StatCard
                        label="Overdue PM"
                        value={statistics.overdue_maintenance}
                        hint="Past the scheduled service date"
                        icon={CalendarClock}
                        alert
                    />
                    <StatCard label="Warranty ending" value={statistics.warranty_expiring} hint="Within the next 90 days" icon={ShieldAlert} alert />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Maintenance due soon</CardTitle>
                        <CardDescription>
                            Preventive plans falling due in the next 30 days.{' '}
                            <Link href="/admin/maintenance-schedules" className="underline underline-offset-4">
                                Open the schedule
                            </Link>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Asset</TableHead>
                                        <TableHead>Task</TableHead>
                                        <TableHead>Due</TableHead>
                                        <TableHead>State</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {upcomingMaintenance.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                                                Nothing falls due in the next 30 days.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        upcomingMaintenance.map((schedule) => (
                                            <TableRow key={schedule.id}>
                                                <TableCell className="font-medium">{schedule.asset?.asset_tag ?? '—'}</TableCell>
                                                <TableCell>{schedule.title}</TableCell>
                                                <TableCell>{formatDate(schedule.next_due_on)}</TableCell>
                                                <TableCell>
                                                    <Badge variant={schedule.is_overdue ? 'danger' : 'warning'}>
                                                        {schedule.is_overdue
                                                            ? `${Math.abs(schedule.days_until_due ?? 0)} days overdue`
                                                            : `In ${schedule.days_until_due} days`}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent issuances</CardTitle>
                            <CardDescription>
                                The latest custody records.{' '}
                                <Link href="/admin/assets" className="underline underline-offset-4">
                                    View all assets
                                </Link>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Asset</TableHead>
                                            <TableHead>Issued to</TableHead>
                                            <TableHead>Issued on</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentAssignments.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-muted-foreground h-24 text-center">
                                                    No assets have been issued yet.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            recentAssignments.map((assignment) => (
                                                <TableRow key={assignment.id}>
                                                    <TableCell className="font-medium">{assignment.asset?.asset_tag ?? '—'}</TableCell>
                                                    <TableCell>{assignment.user?.name ?? '—'}</TableCell>
                                                    <TableCell>{formatDateTime(assignment.assigned_at)}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Recent maintenance requests</CardTitle>
                            <CardDescription>
                                Issues reported by employees.{' '}
                                <Link href="/admin/maintenance-requests" className="underline underline-offset-4">
                                    Open the queue
                                </Link>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Asset</TableHead>
                                            <TableHead>Reported by</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentRequests.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-muted-foreground h-24 text-center">
                                                    No maintenance requests have been submitted yet.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            recentRequests.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="font-medium">{item.asset?.asset_tag ?? '—'}</TableCell>
                                                    <TableCell>{item.requested_by?.name ?? '—'}</TableCell>
                                                    <TableCell>
                                                        <MaintenanceStatusBadge status={item.status} />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
