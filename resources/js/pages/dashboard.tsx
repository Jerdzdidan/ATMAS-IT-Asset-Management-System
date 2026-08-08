import { MaintenanceStatusBadge } from '@/components/status-badges';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime } from '@/lib/format';
import { type BreadcrumbItem, type MaintenanceRequestStatus } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { CheckCircle2, HardDrive, PackageCheck, Wrench } from 'lucide-react';

interface DashboardPageProps {
    statistics: {
        total_assets: number;
        available: number;
        assigned: number;
        under_repair: number;
        retired: number;
        open_requests: number;
    };
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

function StatCard({ label, value, hint, icon: Icon }: { label: string; value: number; hint: string; icon: typeof HardDrive }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-muted-foreground text-xs">{hint}</p>
            </CardContent>
        </Card>
    );
}

export default function DashboardPage({ statistics, recentAssignments, recentRequests }: DashboardPageProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">A live view of the hardware register and the repair queue.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard label="Total assets" value={statistics.total_assets} hint={`${statistics.retired} retired`} icon={HardDrive} />
                    <StatCard label="Available" value={statistics.available} hint="Ready to be issued" icon={CheckCircle2} />
                    <StatCard label="Assigned" value={statistics.assigned} hint="In employee custody" icon={PackageCheck} />
                    <StatCard label="Open requests" value={statistics.open_requests} hint={`${statistics.under_repair} under repair`} icon={Wrench} />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent issuances</CardTitle>
                            <CardDescription>
                                The latest custody records. <Link href="/admin/assets" className="underline underline-offset-4">View all assets</Link>
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
