import { DashboardMasthead } from '@/components/dashboard-masthead';
import { AssetConditionBadge, AssetStatusBadge, MaintenanceStatusBadge } from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime } from '@/lib/format';
import { type AssetCondition, type AssetStatus, type BreadcrumbItem, type MaintenanceRequestStatus } from '@/types';
import { Head, Link } from '@inertiajs/react';

interface EmployeeDashboardPageProps {
    assignedAssets: {
        id: number;
        asset_tag: string;
        name: string;
        status: AssetStatus;
        condition: AssetCondition;
        category: { id: number; name: string } | null;
    }[];
    openRequestCount: number;
    generatedAt: string;
    recentRequests: {
        id: number;
        issue_description: string;
        status: MaintenanceRequestStatus;
        created_at: string;
        asset: { id: number; asset_tag: string; name: string } | null;
    }[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/dashboard' }];

export default function EmployeeDashboardPage({ assignedAssets, openRequestCount, generatedAt, recentRequests }: EmployeeDashboardPageProps) {
    const assetCount = assignedAssets.length;
    const summary =
        assetCount === 0
            ? 'You are not holding any company hardware at the moment.'
            : `You are accountable for ${assetCount} ${assetCount === 1 ? 'asset' : 'assets'}, with ` +
              `${openRequestCount === 0 ? 'no open requests' : `${openRequestCount} open ${openRequestCount === 1 ? 'request' : 'requests'}`}.`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <DashboardMasthead summary={summary} generatedAt={generatedAt} />

                <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div>
                            <CardTitle>Equipment issued to me</CardTitle>
                            <CardDescription>Hardware currently under your accountability.</CardDescription>
                        </div>
                        <Button variant="outline" asChild>
                            <Link href="/my/assets">View details</Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Asset tag</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Condition</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {assignedAssets.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                                                No company hardware is currently issued to you.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        assignedAssets.map((asset) => (
                                            <TableRow key={asset.id}>
                                                <TableCell className="font-medium">{asset.asset_tag}</TableCell>
                                                <TableCell>{asset.name}</TableCell>
                                                <TableCell>{asset.category?.name ?? '—'}</TableCell>
                                                <TableCell>
                                                    <AssetConditionBadge condition={asset.condition} />
                                                </TableCell>
                                                <TableCell>
                                                    <AssetStatusBadge status={asset.status} />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div>
                            <CardTitle>My recent requests</CardTitle>
                            <CardDescription>The latest hardware issues you reported to IT.</CardDescription>
                        </div>
                        <Button variant="outline" asChild>
                            <Link href="/my/requests">All requests</Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Asset</TableHead>
                                        <TableHead>Issue</TableHead>
                                        <TableHead>Submitted</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentRequests.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                                                You have not submitted any maintenance requests yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        recentRequests.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.asset?.asset_tag ?? '—'}</TableCell>
                                                <TableCell className="max-w-md">{item.issue_description}</TableCell>
                                                <TableCell>{formatDateTime(item.created_at)}</TableCell>
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
        </AppLayout>
    );
}
