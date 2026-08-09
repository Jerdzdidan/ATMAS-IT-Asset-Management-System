import { Pagination } from '@/components/pagination';
import { MaintenanceStatusBadge } from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime } from '@/lib/format';
import { type BreadcrumbItem, type MaintenanceRequestStatus, type MaintenanceRequestType } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

interface OwnRequest {
    id: number;
    request_type: MaintenanceRequestType;
    issue_description: string;
    status: MaintenanceRequestStatus;
    resolution_notes: string | null;
    resolved_at: string | null;
    created_at: string;
    asset: { id: number; asset_tag: string; name: string } | null;
    handled_by: { id: number; name: string } | null;
}

interface EmployeeRequestsPageProps {
    requests: OwnRequest[];
    assignedAssets: { id: number; asset_tag: string; name: string }[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'My Requests', href: '/my/requests' },
];

const requestTypeLabels: Record<MaintenanceRequestType, string> = {
    REPAIR: 'Repair',
    PREVENTIVE: 'Preventive maintenance',
    REPLACEMENT: 'Replacement',
};

const emptyForm = { asset_id: '', request_type: 'REPAIR' as MaintenanceRequestType, issue_description: '' };
const pageSize = 10;

export default function EmployeeRequestsPage({ requests, assignedAssets }: EmployeeRequestsPageProps) {
    const [formOpen, setFormOpen] = useState(false);
    const [page, setPage] = useState(1);
    const form = useForm(emptyForm);
    const pageCount = Math.max(1, Math.ceil(requests.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const visibleRequests = requests.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    function openCreate(): void {
        form.setData(emptyForm);
        form.clearErrors();
        setFormOpen(true);
    }

    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        form.post('/my/requests', {
            preserveScroll: true,
            onSuccess: () => {
                setFormOpen(false);
                form.setData(emptyForm);
                toast.success('Maintenance request submitted successfully.');
            },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My maintenance requests" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">My maintenance requests</h1>
                        <p className="text-muted-foreground">Report hardware issues for the equipment issued to you and follow their progress.</p>
                    </div>
                    <Button onClick={openCreate} disabled={assignedAssets.length === 0}>
                        <Plus /> Submit request
                    </Button>
                </div>

                {assignedAssets.length === 0 && (
                    <Card>
                        <CardContent className="text-muted-foreground py-6 text-sm">
                            You can only submit requests for hardware currently issued to you. Contact the IT department if equipment is missing from
                            your records.
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Request history</CardTitle>
                        <CardDescription>Every ticket you have raised, newest first.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Asset</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Issue</TableHead>
                                        <TableHead>Submitted</TableHead>
                                        <TableHead>Handled by</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {visibleRequests.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                                                You have not submitted any maintenance requests yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        visibleRequests.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.asset?.asset_tag ?? '—'}</TableCell>
                                                <TableCell>{requestTypeLabels[item.request_type]}</TableCell>
                                                <TableCell className="max-w-md">
                                                    <p>{item.issue_description}</p>
                                                    {item.resolution_notes && (
                                                        <p className="text-muted-foreground mt-1 text-xs">IT response: {item.resolution_notes}</p>
                                                    )}
                                                </TableCell>
                                                <TableCell>{formatDateTime(item.created_at)}</TableCell>
                                                <TableCell>{item.handled_by?.name ?? '—'}</TableCell>
                                                <TableCell>
                                                    <MaintenanceStatusBadge status={item.status} />
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
                                    {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, requests.length)} of {requests.length}
                                </span>
                                <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={formOpen} onOpenChange={(open) => !form.processing && setFormOpen(open)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Submit maintenance request</DialogTitle>
                        <DialogDescription>Describe the problem so IT can diagnose the hardware quickly.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Equipment</Label>
                            <Select value={form.data.asset_id} onValueChange={(value) => form.setData('asset_id', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select your equipment" />
                                </SelectTrigger>
                                <SelectContent>
                                    {assignedAssets.map((asset) => (
                                        <SelectItem key={asset.id} value={String(asset.id)}>
                                            {asset.asset_tag} — {asset.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.errors.asset_id && <p className="text-destructive text-sm">{form.errors.asset_id}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Request type</Label>
                            <Select
                                value={form.data.request_type}
                                onValueChange={(value: MaintenanceRequestType) => form.setData('request_type', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="REPAIR">Repair</SelectItem>
                                    <SelectItem value="PREVENTIVE">Preventive maintenance</SelectItem>
                                    <SelectItem value="REPLACEMENT">Replacement</SelectItem>
                                </SelectContent>
                            </Select>
                            {form.errors.request_type && <p className="text-destructive text-sm">{form.errors.request_type}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="issue-description">Issue description</Label>
                            <Textarea
                                id="issue-description"
                                placeholder="Describe what is wrong and when it started."
                                value={form.data.issue_description}
                                onChange={(event) => form.setData('issue_description', event.target.value)}
                            />
                            {form.errors.issue_description && <p className="text-destructive text-sm">{form.errors.issue_description}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Submitting...' : 'Submit request'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
