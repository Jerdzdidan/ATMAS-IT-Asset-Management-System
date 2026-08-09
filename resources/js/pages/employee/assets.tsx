import { Pagination } from '@/components/pagination';
import { AssetConditionBadge, AssetStatusBadge } from '@/components/status-badges';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatDateTime } from '@/lib/format';
import { type AssetCondition, type AssetStatus, type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

interface AssignedAsset {
    id: number;
    asset_tag: string;
    name: string;
    brand: string | null;
    model: string | null;
    serial_number: string | null;
    location: string | null;
    status: AssetStatus;
    condition: AssetCondition;
    warranty_expires_at: string | null;
    category: { id: number; name: string } | null;
}

interface AssignmentRecord {
    id: number;
    assigned_at: string;
    returned_at: string | null;
    notes: string | null;
    asset: AssignedAsset | null;
}

interface EmployeeAssetsPageProps {
    assignments: AssignmentRecord[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'My Assets', href: '/my/assets' },
];

const pageSize = 10;

export default function EmployeeAssetsPage({ assignments }: EmployeeAssetsPageProps) {
    const [page, setPage] = useState(1);
    const activeAssignments = assignments.filter((assignment) => assignment.returned_at === null);
    const pastAssignments = assignments.filter((assignment) => assignment.returned_at !== null);
    const pageCount = Math.max(1, Math.ceil(pastAssignments.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const visiblePastAssignments = pastAssignments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My assets" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">My assets</h1>
                    <p className="text-muted-foreground">Company hardware currently issued to you and everything you have returned.</p>
                </div>

                {activeAssignments.length === 0 ? (
                    <Card>
                        <CardContent className="text-muted-foreground py-10 text-center text-sm">
                            You currently have no company hardware issued to you.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {activeAssignments.map((assignment) => (
                            <Card key={assignment.id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <CardTitle>{assignment.asset?.asset_tag}</CardTitle>
                                            <CardDescription>
                                                {assignment.asset?.name}
                                                {assignment.asset?.category ? ` · ${assignment.asset.category.name}` : ''}
                                            </CardDescription>
                                        </div>
                                        {assignment.asset && <AssetStatusBadge status={assignment.asset.status} />}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-muted-foreground text-xs tracking-wide uppercase">Brand / model</p>
                                            <p className="font-medium">
                                                {[assignment.asset?.brand, assignment.asset?.model].filter(Boolean).join(' ') || '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-xs tracking-wide uppercase">Serial number</p>
                                            <p className="font-medium">{assignment.asset?.serial_number ?? '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-xs tracking-wide uppercase">Location</p>
                                            <p className="font-medium">{assignment.asset?.location ?? '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-xs tracking-wide uppercase">Warranty until</p>
                                            <p className="font-medium">{formatDate(assignment.asset?.warranty_expires_at)}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-xs tracking-wide uppercase">Issued on</p>
                                            <p className="font-medium">{formatDateTime(assignment.assigned_at)}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-xs tracking-wide uppercase">Condition</p>
                                            {assignment.asset && <AssetConditionBadge condition={assignment.asset.condition} />}
                                        </div>
                                    </div>
                                    {assignment.notes && <p className="text-muted-foreground border-t pt-3">{assignment.notes}</p>}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Returned equipment</CardTitle>
                        <CardDescription>Hardware previously issued to you and since handed back to IT.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Asset tag</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Issued on</TableHead>
                                        <TableHead>Returned on</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {visiblePastAssignments.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                                                No returned equipment on record.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        visiblePastAssignments.map((assignment) => (
                                            <TableRow key={assignment.id}>
                                                <TableCell className="font-medium">{assignment.asset?.asset_tag ?? '—'}</TableCell>
                                                <TableCell>{assignment.asset?.name ?? '—'}</TableCell>
                                                <TableCell>{formatDateTime(assignment.assigned_at)}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{formatDateTime(assignment.returned_at)}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        {pageCount > 1 && (
                            <div className="text-muted-foreground flex flex-col gap-3 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                                <span>
                                    {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, pastAssignments.length)} of{' '}
                                    {pastAssignments.length}
                                </span>
                                <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
