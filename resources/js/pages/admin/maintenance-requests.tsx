import { AdminDataTable, type AdminTableColumn } from '@/components/admin/admin-data-table';
import { MaintenanceStatusBadge } from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime } from '@/lib/format';
import { type BreadcrumbItem, type MaintenanceRequestStatus, type MaintenanceRequestType, type SharedData } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

interface ManagedRequest {
    id: number;
    request_type: MaintenanceRequestType;
    issue_description: string;
    status: MaintenanceRequestStatus;
    resolution_notes: string | null;
    resolved_at: string | null;
    created_at: string;
    asset: { id: number; asset_tag: string; name: string } | null;
    requested_by: { id: number; name: string; employee_code: string | null } | null;
    handled_by: { id: number; name: string } | null;
}

type ProcessableStatus = Exclude<MaintenanceRequestStatus, 'PENDING'>;

interface MaintenanceRequestsPageProps {
    requests: ManagedRequest[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Maintenance', href: '/admin/maintenance-requests' },
];

const requestTypeLabels: Record<MaintenanceRequestType, string> = {
    REPAIR: 'Repair',
    PREVENTIVE: 'Preventive',
    REPLACEMENT: 'Replacement',
};

export default function MaintenanceRequestsPage({ requests }: MaintenanceRequestsPageProps) {
    const { permissions } = usePage<SharedData>().props.auth;
    const [processingRequest, setProcessingRequest] = useState<ManagedRequest | null>(null);
    const form = useForm<{ status: ProcessableStatus; resolution_notes: string }>({ status: 'IN_PROGRESS', resolution_notes: '' });

    const columns: AdminTableColumn<ManagedRequest>[] = [
        {
            key: 'asset',
            label: 'Asset',
            render: (item) => (
                <div>
                    <p className="font-medium">{item.asset?.asset_tag ?? '—'}</p>
                    <p className="text-muted-foreground text-xs">{item.asset?.name ?? ''}</p>
                </div>
            ),
            sortValue: (item) => item.asset?.asset_tag ?? '',
        },
        {
            key: 'requested_by',
            label: 'Reported by',
            render: (item) => item.requested_by?.name ?? '—',
            sortValue: (item) => item.requested_by?.name ?? '',
        },
        {
            key: 'request_type',
            label: 'Type',
            render: (item) => requestTypeLabels[item.request_type],
            sortValue: (item) => item.request_type,
        },
        { key: 'issue_description', label: 'Issue', className: 'max-w-md', render: (item) => item.issue_description },
        { key: 'created_at', label: 'Reported', render: (item) => formatDateTime(item.created_at), sortValue: (item) => item.created_at },
        {
            key: 'status',
            label: 'Status',
            render: (item) => <MaintenanceStatusBadge status={item.status} />,
            sortValue: (item) => item.status,
        },
    ];

    function openProcess(maintenanceRequest: ManagedRequest): void {
        setProcessingRequest(maintenanceRequest);
        form.setData({
            status: maintenanceRequest.status === 'PENDING' ? 'IN_PROGRESS' : 'RESOLVED',
            resolution_notes: maintenanceRequest.resolution_notes ?? '',
        });
        form.clearErrors();
    }

    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        if (!processingRequest) return;

        form.patch(`/admin/maintenance-requests/${processingRequest.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setProcessingRequest(null);
                toast.success('Maintenance request updated successfully.');
            },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Maintenance requests" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Maintenance requests</h1>
                    <p className="text-muted-foreground">
                        {permissions.is_department_scoped
                            ? 'Repair queue for the hardware your department is accountable for.'
                            : 'Repair queue submitted by employees for the hardware in their custody.'}
                    </p>
                </div>
                <AdminDataTable
                    data={requests}
                    columns={columns}
                    searchPlaceholder="Search requests..."
                    getSearchText={(item) =>
                        `${item.asset?.asset_tag ?? ''} ${item.asset?.name ?? ''} ${item.requested_by?.name ?? ''} ${item.issue_description}`
                    }
                    onEdit={permissions.manages_assets ? openProcess : undefined}
                    filterOptions={[
                        { value: 'ALL', label: 'All statuses' },
                        { value: 'PENDING', label: 'Pending' },
                        { value: 'IN_PROGRESS', label: 'In progress' },
                        { value: 'RESOLVED', label: 'Resolved' },
                        { value: 'REJECTED', label: 'Rejected' },
                    ]}
                    getFilterValue={(item) => item.status}
                />
            </div>

            <Dialog open={Boolean(processingRequest)} onOpenChange={(open) => !open && setProcessingRequest(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update maintenance request</DialogTitle>
                        <DialogDescription>
                            {processingRequest?.asset?.asset_tag} — reported by {processingRequest?.requested_by?.name ?? 'an employee'}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-muted/50 rounded-md border p-3 text-sm">{processingRequest?.issue_description}</div>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={form.data.status} onValueChange={(value: ProcessableStatus) => form.setData('status', value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                                    <SelectItem value="REJECTED">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                            {form.errors.status && <p className="text-destructive text-sm">{form.errors.status}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="resolution-notes">Resolution notes</Label>
                            <Textarea
                                id="resolution-notes"
                                placeholder="Describe the action taken or the reason for rejection."
                                value={form.data.resolution_notes}
                                onChange={(event) => form.setData('resolution_notes', event.target.value)}
                            />
                            {form.errors.resolution_notes && <p className="text-destructive text-sm">{form.errors.resolution_notes}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setProcessingRequest(null)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Saving...' : 'Update request'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
