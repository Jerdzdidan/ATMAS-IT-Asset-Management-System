import { AssetConditionBadge, AssetStatusBadge, MaintenanceStatusBadge, maintenanceFrequencyLabels } from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { currentDateTimeLocal, formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import {
    type AssetCondition,
    type AssetPhoto,
    type AssetStatus,
    type BreadcrumbItem,
    type MaintenanceRequestStatus,
    type MaintenanceRequestType,
    type MaintenanceSchedule,
    type SharedData,
} from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, ArrowLeftRight, ChevronLeft, ChevronRight, ImageDown, ImagePlus, PackageCheck, RotateCcw, Star, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

interface AssignmentRecord {
    id: number;
    assigned_at: string;
    returned_at: string | null;
    notes: string | null;
    return_notes: string | null;
    user: { id: number; name: string; employee_code: string | null } | null;
    assigned_by: { id: number; name: string } | null;
    returned_by: { id: number; name: string } | null;
}

interface MaintenanceRecord {
    id: number;
    request_type: MaintenanceRequestType;
    issue_description: string;
    status: MaintenanceRequestStatus;
    resolution_notes: string | null;
    resolved_at: string | null;
    created_at: string;
    requested_by: { id: number; name: string } | null;
    handled_by: { id: number; name: string } | null;
}

interface AssetDetail {
    id: number;
    asset_tag: string;
    name: string;
    brand: string | null;
    model: string | null;
    serial_number: string | null;
    location: string | null;
    status: AssetStatus;
    condition: AssetCondition;
    purchase_date: string | null;
    warranty_expires_at: string | null;
    purchase_cost: string | null;
    remarks: string | null;
    category: { id: number; name: string } | null;
    department: { id: number; name: string } | null;
    assignments: AssignmentRecord[];
    maintenance_requests: MaintenanceRecord[];
    photos: AssetPhoto[];
    maintenance_schedules: MaintenanceSchedule[];
}

interface AssetShowPageProps {
    asset: AssetDetail;
    currentAssignment: AssignmentRecord | null;
    assignableUsers: { id: number; name: string; employee_code: string | null }[];
    qrCode: string;
    labelPngUrl: string;
}

const requestTypeLabels: Record<MaintenanceRequestType, string> = {
    REPAIR: 'Repair',
    PREVENTIVE: 'Preventive',
    REPLACEMENT: 'Replacement',
};

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <p className="text-muted-foreground text-xs tracking-wide uppercase">{label}</p>
            <div className="text-sm font-medium">{children}</div>
        </div>
    );
}

export default function AssetShowPage({ asset, currentAssignment, assignableUsers, qrCode, labelPngUrl }: AssetShowPageProps) {
    const { permissions } = usePage<SharedData>().props.auth;
    const [assignOpen, setAssignOpen] = useState(false);
    const [returnOpen, setReturnOpen] = useState(false);
    /** Which photo the viewer is showing, or null while it is closed. */
    const [viewedPhoto, setViewedPhoto] = useState<number | null>(null);

    const assignForm = useForm({ user_id: '', assigned_at: currentDateTimeLocal(), notes: '' });
    const returnForm = useForm({ returned_at: currentDateTimeLocal(), condition: asset.condition, return_notes: '' });
    const lifecycleForm = useForm<Record<string, never>>({});
    const photoForm = useForm<{ photos: File[]; caption: string }>({ photos: [], caption: '' });
    const photoInputRef = useRef<HTMLInputElement>(null);

    const photoCount = asset.photos.length;
    // Guarded by index rather than by the open flag alone: deleting the last photo while the
    // viewer is up would otherwise leave it pointing past the end of the array.
    const currentPhoto = viewedPhoto === null ? undefined : asset.photos[viewedPhoto];

    /** Move through the photos, wrapping at both ends so the arrows never dead-end. */
    function stepPhoto(offset: number): void {
        setViewedPhoto((current) => (current === null ? current : (current + offset + photoCount) % photoCount));
    }

    // Arrow keys drive the viewer; Escape and the focus trap are Radix's job.
    useEffect(() => {
        if (currentPhoto === undefined) {
            return;
        }

        function handleKey(event: KeyboardEvent): void {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
                return;
            }

            event.preventDefault();
            setViewedPhoto((current) => (current === null ? current : (current + (event.key === 'ArrowLeft' ? -1 : 1) + photoCount) % photoCount));
        }

        window.addEventListener('keydown', handleKey);

        return () => window.removeEventListener('keydown', handleKey);
    }, [currentPhoto, photoCount]);

    function uploadPhotos(files: FileList | null): void {
        if (files === null || files.length === 0) {
            return;
        }

        photoForm.transform(() => ({ photos: Array.from(files), caption: '' }));
        photoForm.post(`/admin/assets/${asset.id}/photos`, {
            preserveScroll: true,
            onSuccess: () => toast.success('Photos uploaded successfully.'),
            // Clearing the native input is what allows the same file to be picked twice.
            onFinish: () => {
                if (photoInputRef.current) photoInputRef.current.value = '';
            },
        });
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Assets', href: '/admin/assets' },
        { title: asset.asset_tag, href: `/admin/assets/${asset.id}` },
    ];

    function submitAssign(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        assignForm.post(`/admin/assets/${asset.id}/assignments`, {
            preserveScroll: true,
            onSuccess: () => {
                setAssignOpen(false);
                assignForm.reset();
                toast.success('Asset issued successfully.');
            },
        });
    }

    function submitReturn(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        if (!currentAssignment) return;

        returnForm.patch(`/admin/assignments/${currentAssignment.id}/return`, {
            preserveScroll: true,
            onSuccess: () => {
                setReturnOpen(false);
                returnForm.reset();
                toast.success('Asset returned successfully.');
            },
        });
    }

    function changeLifecycle(action: 'retire' | 'restore'): void {
        lifecycleForm.post(`/admin/assets/${asset.id}/${action}`, {
            preserveScroll: true,
            onSuccess: () => toast.success(action === 'retire' ? 'Asset retired successfully.' : 'Asset restored successfully.'),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Asset ${asset.asset_tag}`} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                {/* A plain way back to the register, for anyone who arrived by scanning a label rather than from the list. */}
                <Link
                    href="/admin/assets"
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -mb-2 inline-flex w-fit items-center gap-1.5 rounded-md text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
                >
                    <ArrowLeft className="size-4" />
                    Back to asset list
                </Link>

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold tracking-tight">{asset.asset_tag}</h1>
                        <p className="text-muted-foreground">
                            {asset.name}
                            {asset.category ? ` · ${asset.category.name}` : ''}
                        </p>
                        <div className="flex gap-2 pt-1">
                            <AssetStatusBadge status={asset.status} />
                            <AssetConditionBadge condition={asset.condition} />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline">
                            <a href={labelPngUrl}>
                                <ImageDown /> Download label
                            </a>
                        </Button>
                        {permissions.manages_assets && (
                            <>
                                {asset.status === 'AVAILABLE' && (
                                    <Button onClick={() => setAssignOpen(true)}>
                                        <ArrowLeftRight /> Issue asset
                                    </Button>
                                )}
                                {currentAssignment && (
                                    <Button onClick={() => setReturnOpen(true)}>
                                        <PackageCheck /> Record return
                                    </Button>
                                )}
                                {asset.status === 'RETIRED' ? (
                                    <Button variant="outline" onClick={() => changeLifecycle('restore')} disabled={lifecycleForm.processing}>
                                        <RotateCcw /> Restore
                                    </Button>
                                ) : (
                                    <Button variant="outline" onClick={() => changeLifecycle('retire')} disabled={lifecycleForm.processing}>
                                        Retire
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {lifecycleForm.errors.asset && <p className="text-destructive text-sm">{lifecycleForm.errors.asset}</p>}

                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Asset details</CardTitle>
                            <CardDescription>Identification, classification, and acquisition record.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            <DetailRow label="Brand">{asset.brand ?? '—'}</DetailRow>
                            <DetailRow label="Model">{asset.model ?? '—'}</DetailRow>
                            <DetailRow label="Serial number">{asset.serial_number ?? '—'}</DetailRow>
                            <DetailRow label="Department">{asset.department?.name ?? '—'}</DetailRow>
                            <DetailRow label="Location">{asset.location ?? '—'}</DetailRow>
                            <DetailRow label="Purchase date">{formatDate(asset.purchase_date)}</DetailRow>
                            <DetailRow label="Warranty expiry">{formatDate(asset.warranty_expires_at)}</DetailRow>
                            <DetailRow label="Purchase cost">{formatCurrency(asset.purchase_cost)}</DetailRow>
                            <div className="sm:col-span-2 lg:col-span-3">
                                <DetailRow label="Remarks">{asset.remarks ?? '—'}</DetailRow>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex flex-col gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Current custody</CardTitle>
                                <CardDescription>Who is accountable for this asset today.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                {currentAssignment ? (
                                    <>
                                        <DetailRow label="Assigned to">{currentAssignment.user?.name ?? '—'}</DetailRow>
                                        <DetailRow label="Employee code">{currentAssignment.user?.employee_code ?? '—'}</DetailRow>
                                        <DetailRow label="Issued on">{formatDateTime(currentAssignment.assigned_at)}</DetailRow>
                                        <DetailRow label="Issued by">{currentAssignment.assigned_by?.name ?? '—'}</DetailRow>
                                        <DetailRow label="Notes">{currentAssignment.notes ?? '—'}</DetailRow>
                                    </>
                                ) : (
                                    <p className="text-muted-foreground text-sm">
                                        This asset is not currently issued to anyone.
                                        {asset.status === 'AVAILABLE' && permissions.manages_assets ? ' Use "Issue asset" to assign it.' : ''}
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Asset label</CardTitle>
                                <CardDescription>Scanning this code opens the record on any signed-in device.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center gap-3">
                                <img src={qrCode} alt={`QR code for ${asset.asset_tag}`} className="size-40 rounded-md border bg-white p-2" />
                                <p className="font-mono text-sm font-semibold">{asset.asset_tag}</p>
                                <Button asChild variant="outline" size="sm" className="w-full">
                                    <a href={labelPngUrl}>
                                        <ImageDown /> Download label (PNG)
                                    </a>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Photos</CardTitle>
                            <CardDescription>Condition evidence for audits, insurance claims, and handover disputes.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {asset.photos.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No photos have been attached to this asset yet.</p>
                            ) : (
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    {asset.photos.map((photo, index) => (
                                        <figure key={photo.id} className="group relative overflow-hidden rounded-md border">
                                            {/*
                                                The overlay buttons are siblings of this one rather than children, so
                                                a click on Delete never opens the viewer on its way through.
                                            */}
                                            <button
                                                type="button"
                                                className="focus-visible:ring-ring block w-full cursor-pointer focus-visible:ring-2 focus-visible:outline-hidden"
                                                onClick={() => setViewedPhoto(index)}
                                                aria-label={`View photo ${index + 1} of ${photoCount}`}
                                            >
                                                <img
                                                    src={photo.url}
                                                    alt={photo.caption ?? `Condition photo of ${asset.asset_tag}`}
                                                    className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                                                />
                                            </button>
                                            {photo.is_primary && (
                                                <span className="bg-primary text-primary-foreground absolute top-1 left-1 rounded px-1.5 py-0.5 text-[10px] font-semibold">
                                                    Primary
                                                </span>
                                            )}
                                            {permissions.manages_assets && (
                                                <figcaption className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-black/55 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                    {!photo.is_primary && (
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="secondary"
                                                            className="size-7"
                                                            aria-label="Make primary"
                                                            onClick={() =>
                                                                router.post(
                                                                    `/admin/assets/${asset.id}/photos/${photo.id}/primary`,
                                                                    {},
                                                                    { preserveScroll: true },
                                                                )
                                                            }
                                                        >
                                                            <Star />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="destructive"
                                                        className="size-7"
                                                        aria-label="Delete photo"
                                                        onClick={() =>
                                                            router.delete(`/admin/assets/${asset.id}/photos/${photo.id}`, { preserveScroll: true })
                                                        }
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                </figcaption>
                                            )}
                                        </figure>
                                    ))}
                                </div>
                            )}

                            {permissions.manages_assets && (
                                <div className="space-y-2">
                                    <input
                                        ref={photoInputRef}
                                        id="asset-photos"
                                        type="file"
                                        multiple
                                        accept="image/jpeg,image/png,image/webp"
                                        className="hidden"
                                        onChange={(event) => uploadPhotos(event.target.files)}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={photoForm.processing}
                                        onClick={() => photoInputRef.current?.click()}
                                    >
                                        <ImagePlus />
                                        {photoForm.processing ? `Uploading… ${photoForm.progress?.percentage ?? 0}%` : 'Add photos'}
                                    </Button>
                                    {photoForm.errors.photos && <p className="text-destructive text-sm">{photoForm.errors.photos}</p>}
                                    <p className="text-muted-foreground text-xs">JPG, PNG, or WebP up to 5 MB each, six at a time.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Preventive maintenance</CardTitle>
                            <CardDescription>
                                Recurring service plans for this asset.{' '}
                                <Link href="/admin/maintenance-schedules" className="underline underline-offset-4">
                                    Manage schedules
                                </Link>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Task</TableHead>
                                            <TableHead>Cycle</TableHead>
                                            <TableHead>Last done</TableHead>
                                            <TableHead>Next due</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {asset.maintenance_schedules.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                                                    No maintenance plans for this asset.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            asset.maintenance_schedules.map((schedule) => (
                                                <TableRow key={schedule.id}>
                                                    <TableCell className="font-medium">{schedule.title}</TableCell>
                                                    <TableCell>{maintenanceFrequencyLabels[schedule.frequency]}</TableCell>
                                                    <TableCell>{formatDate(schedule.last_completed_on)}</TableCell>
                                                    <TableCell className={schedule.is_overdue ? 'text-destructive font-medium' : undefined}>
                                                        {formatDate(schedule.next_due_on)}
                                                        {schedule.is_overdue ? ' · overdue' : ''}
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

                <Card>
                    <CardHeader>
                        <CardTitle>Assignment history</CardTitle>
                        <CardDescription>Every issuance and return recorded for this asset.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Issued on</TableHead>
                                        <TableHead>Issued by</TableHead>
                                        <TableHead>Returned on</TableHead>
                                        <TableHead>Received by</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {asset.assignments.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                                                No custody records yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        asset.assignments.map((assignment) => (
                                            <TableRow key={assignment.id}>
                                                <TableCell className="font-medium">{assignment.user?.name ?? '—'}</TableCell>
                                                <TableCell>{formatDateTime(assignment.assigned_at)}</TableCell>
                                                <TableCell>{assignment.assigned_by?.name ?? '—'}</TableCell>
                                                <TableCell>
                                                    {assignment.returned_at ? (
                                                        formatDateTime(assignment.returned_at)
                                                    ) : (
                                                        <span className="text-muted-foreground">Still assigned</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>{assignment.returned_by?.name ?? '—'}</TableCell>
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
                        <CardTitle>Maintenance history</CardTitle>
                        <CardDescription>Repair and servicing tickets logged against this asset.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Reported</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Issue</TableHead>
                                        <TableHead>Reported by</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {asset.maintenance_requests.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                                                No maintenance records yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        asset.maintenance_requests.map((maintenanceRequest) => (
                                            <TableRow key={maintenanceRequest.id}>
                                                <TableCell>{formatDateTime(maintenanceRequest.created_at)}</TableCell>
                                                <TableCell>{requestTypeLabels[maintenanceRequest.request_type]}</TableCell>
                                                <TableCell className="max-w-md">{maintenanceRequest.issue_description}</TableCell>
                                                <TableCell>{maintenanceRequest.requested_by?.name ?? '—'}</TableCell>
                                                <TableCell>
                                                    <MaintenanceStatusBadge status={maintenanceRequest.status} />
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

            <Dialog open={assignOpen} onOpenChange={(open) => !assignForm.processing && setAssignOpen(open)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Issue asset</DialogTitle>
                        <DialogDescription>Hand {asset.asset_tag} over to an employee and open a custody record.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitAssign} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="assign-user">Employee</Label>
                            <Combobox
                                id="assign-user"
                                value={assignForm.data.user_id}
                                onValueChange={(value) => assignForm.setData('user_id', value)}
                                placeholder="Search by name or employee code"
                                emptyMessage="No employee matches that search."
                                options={assignableUsers.map((user) => ({
                                    value: String(user.id),
                                    label: user.name,
                                    description: user.employee_code ?? undefined,
                                }))}
                            />
                            {assignForm.errors.user_id && <p className="text-destructive text-sm">{assignForm.errors.user_id}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="assigned-at">Issued on</Label>
                            <Input
                                id="assigned-at"
                                type="datetime-local"
                                value={assignForm.data.assigned_at}
                                onChange={(event) => assignForm.setData('assigned_at', event.target.value)}
                            />
                            {assignForm.errors.assigned_at && <p className="text-destructive text-sm">{assignForm.errors.assigned_at}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="assign-notes">Notes</Label>
                            <Textarea
                                id="assign-notes"
                                value={assignForm.data.notes}
                                onChange={(event) => assignForm.setData('notes', event.target.value)}
                            />
                            {assignForm.errors.notes && <p className="text-destructive text-sm">{assignForm.errors.notes}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={assignForm.processing}>
                                {assignForm.processing ? 'Issuing...' : 'Issue asset'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={returnOpen} onOpenChange={(open) => !returnForm.processing && setReturnOpen(open)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Record return</DialogTitle>
                        <DialogDescription>Close the custody record and note the condition the asset came back in.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitReturn} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="returned-at">Returned on</Label>
                            <Input
                                id="returned-at"
                                type="datetime-local"
                                value={returnForm.data.returned_at}
                                onChange={(event) => returnForm.setData('returned_at', event.target.value)}
                            />
                            {returnForm.errors.returned_at && <p className="text-destructive text-sm">{returnForm.errors.returned_at}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Condition on return</Label>
                            <Select
                                value={returnForm.data.condition}
                                onValueChange={(value: AssetCondition) => returnForm.setData('condition', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NEW">New</SelectItem>
                                    <SelectItem value="GOOD">Good</SelectItem>
                                    <SelectItem value="FAIR">Fair</SelectItem>
                                    <SelectItem value="POOR">Poor</SelectItem>
                                </SelectContent>
                            </Select>
                            {returnForm.errors.condition && <p className="text-destructive text-sm">{returnForm.errors.condition}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="return-notes">Return notes</Label>
                            <Textarea
                                id="return-notes"
                                value={returnForm.data.return_notes}
                                onChange={(event) => returnForm.setData('return_notes', event.target.value)}
                            />
                            {returnForm.errors.return_notes && <p className="text-destructive text-sm">{returnForm.errors.return_notes}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setReturnOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={returnForm.processing}>
                                {returnForm.processing ? 'Saving...' : 'Record return'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={currentPhoto !== undefined} onOpenChange={(open) => !open && setViewedPhoto(null)}>
                <DialogContent className="w-[95vw] max-w-4xl gap-0 overflow-hidden p-0">
                    {currentPhoto && (
                        <>
                            {/* The caption sits above the image so the close button lands on the panel,
                                not on whatever happens to be in the top-right of the photograph. */}
                            <DialogHeader className="space-y-1 p-4 pr-12 text-left">
                                <DialogTitle className="text-base">
                                    Photo {(viewedPhoto ?? 0) + 1} of {photoCount}
                                </DialogTitle>
                                <DialogDescription>
                                    {[
                                        currentPhoto.caption,
                                        currentPhoto.is_primary ? 'Primary' : null,
                                        `Uploaded ${formatDateTime(currentPhoto.created_at)}`,
                                    ]
                                        .filter((part): part is string => Boolean(part))
                                        .join(' · ')}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="relative flex items-center justify-center bg-black">
                                <img
                                    src={currentPhoto.url}
                                    alt={currentPhoto.caption ?? `Condition photo of ${asset.asset_tag}`}
                                    className="max-h-[70vh] w-auto max-w-full object-contain"
                                />
                                {photoCount > 1 && (
                                    <>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="secondary"
                                            className="absolute top-1/2 left-3 -translate-y-1/2"
                                            aria-label="Previous photo"
                                            onClick={() => stepPhoto(-1)}
                                        >
                                            <ChevronLeft />
                                        </Button>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="secondary"
                                            className="absolute top-1/2 right-3 -translate-y-1/2"
                                            aria-label="Next photo"
                                            onClick={() => stepPhoto(1)}
                                        >
                                            <ChevronRight />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
