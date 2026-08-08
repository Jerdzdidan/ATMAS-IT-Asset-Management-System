import { AdminDataTable, type AdminTableColumn } from '@/components/admin/admin-data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/format';
import { type BreadcrumbItem, type MaintenanceFrequency, type MaintenanceSchedule, type SharedData } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { CalendarClock, CalendarX2, Plus, Wrench } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

interface MaintenanceSchedulesPageProps {
    schedules: MaintenanceSchedule[];
    assets: { id: number; asset_tag: string; name: string }[];
    frequencies: { value: MaintenanceFrequency; label: string }[];
    statistics: { total: number; overdue: number; due_this_month: number };
}

interface ScheduleFormData {
    asset_id: string;
    title: string;
    frequency: MaintenanceFrequency;
    next_due_on: string;
    instructions: string;
    is_active: boolean;
    [key: string]: string | boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'PM schedules', href: '/admin/maintenance-schedules' },
];

function emptyForm(): ScheduleFormData {
    return {
        asset_id: '',
        title: '',
        frequency: 'QUARTERLY',
        next_due_on: new Date().toISOString().slice(0, 10),
        instructions: '',
        is_active: true,
    };
}

/** Describe how close a plan is to falling due, in the words a technician would use. */
function dueLabel(schedule: MaintenanceSchedule): { text: string; variant: 'success' | 'info' | 'warning' | 'danger' | 'neutral' } {
    if (!schedule.is_active) return { text: 'Paused', variant: 'neutral' };
    if (schedule.days_until_due === null) return { text: '—', variant: 'neutral' };
    if (schedule.days_until_due < 0) return { text: `${Math.abs(schedule.days_until_due)} days overdue`, variant: 'danger' };
    if (schedule.days_until_due === 0) return { text: 'Due today', variant: 'warning' };
    if (schedule.days_until_due <= 30) return { text: `Due in ${schedule.days_until_due} days`, variant: 'warning' };

    return { text: `Due in ${schedule.days_until_due} days`, variant: 'success' };
}

export default function MaintenanceSchedulesPage({ schedules, assets, frequencies, statistics }: MaintenanceSchedulesPageProps) {
    const { permissions } = usePage<SharedData>().props.auth;
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<MaintenanceSchedule | null>(null);
    const [completing, setCompleting] = useState<MaintenanceSchedule | null>(null);
    const [deleting, setDeleting] = useState<MaintenanceSchedule | null>(null);

    const form = useForm<ScheduleFormData>(emptyForm());
    const completionForm = useForm({ notes: '' });

    const frequencyLabels = Object.fromEntries(frequencies.map((frequency) => [frequency.value, frequency.label])) as Record<
        MaintenanceFrequency,
        string
    >;

    const columns: AdminTableColumn<MaintenanceSchedule>[] = [
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
        { key: 'title', label: 'Task', render: (item) => item.title, sortValue: (item) => item.title },
        {
            key: 'frequency',
            label: 'Frequency',
            render: (item) => frequencyLabels[item.frequency] ?? item.frequency,
            sortValue: (item) => item.frequency,
        },
        {
            key: 'last_completed_on',
            label: 'Last done',
            render: (item) => formatDate(item.last_completed_on),
            sortValue: (item) => item.last_completed_on ?? '',
        },
        { key: 'next_due_on', label: 'Next due', render: (item) => formatDate(item.next_due_on), sortValue: (item) => item.next_due_on },
        {
            key: 'state',
            label: 'State',
            render: (item) => {
                const { text, variant } = dueLabel(item);

                return <Badge variant={variant}>{text}</Badge>;
            },
            sortValue: (item) => item.days_until_due ?? 99999,
        },
    ];

    function openCreate(): void {
        setEditing(null);
        form.setData(emptyForm());
        form.clearErrors();
        setDialogOpen(true);
    }

    function openEdit(schedule: MaintenanceSchedule): void {
        setEditing(schedule);
        form.setData({
            asset_id: String(schedule.asset_id),
            title: schedule.title,
            frequency: schedule.frequency,
            next_due_on: schedule.next_due_on,
            instructions: schedule.instructions ?? '',
            is_active: schedule.is_active,
        });
        form.clearErrors();
        setDialogOpen(true);
    }

    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setDialogOpen(false);
                toast.success(editing ? 'Schedule updated successfully.' : 'Schedule created successfully.');
            },
        };

        if (editing) {
            form.patch(`/admin/maintenance-schedules/${editing.id}`, options);
        } else {
            form.post('/admin/maintenance-schedules', options);
        }
    }

    function submitCompletion(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        if (!completing) return;

        completionForm.post(`/admin/maintenance-schedules/${completing.id}/complete`, {
            preserveScroll: true,
            onSuccess: () => {
                setCompleting(null);
                completionForm.reset();
                toast.success('Service logged. The next visit has been scheduled.');
            },
        });
    }

    function confirmDelete(): void {
        if (!deleting) return;

        form.delete(`/admin/maintenance-schedules/${deleting.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeleting(null);
                toast.success('Schedule deleted successfully.');
            },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Maintenance schedules" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Preventive maintenance</h1>
                        <p className="text-muted-foreground">
                            Recurring service plans. Logging a service rolls the plan forward and files a ticket in the asset's history.
                        </p>
                    </div>
                    {permissions.manages_assets && (
                        <Button onClick={openCreate}>
                            <Plus /> New schedule
                        </Button>
                    )}
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active plans</CardTitle>
                            <CalendarClock className="text-muted-foreground size-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{statistics.total}</div>
                            <p className="text-muted-foreground text-xs">Across every asset you can see</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                            <CalendarX2 className="text-destructive size-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-destructive text-2xl font-bold">{statistics.overdue}</div>
                            <p className="text-muted-foreground text-xs">Past the scheduled date</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Due within 30 days</CardTitle>
                            <Wrench className="text-muted-foreground size-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{statistics.due_this_month}</div>
                            <p className="text-muted-foreground text-xs">Plan technician time</p>
                        </CardContent>
                    </Card>
                </div>

                <AdminDataTable
                    data={schedules}
                    columns={columns}
                    searchPlaceholder="Search schedules..."
                    getSearchText={(item) => `${item.asset?.asset_tag ?? ''} ${item.asset?.name ?? ''} ${item.title}`}
                    onEdit={permissions.manages_assets ? openEdit : undefined}
                    onDelete={permissions.manages_assets ? setDeleting : undefined}
                    extraActions={
                        permissions.manages_assets
                            ? [
                                  {
                                      label: 'Log service',
                                      onSelect: (item) => {
                                          setCompleting(item);
                                          completionForm.reset();
                                      },
                                      disabled: (item) => !item.is_active,
                                  },
                              ]
                            : undefined
                    }
                    filterOptions={[
                        { value: 'ALL', label: 'All plans' },
                        { value: 'OVERDUE', label: 'Overdue' },
                        { value: 'DUE_SOON', label: 'Due within 30 days' },
                        { value: 'SCHEDULED', label: 'Scheduled' },
                        { value: 'PAUSED', label: 'Paused' },
                    ]}
                    getFilterValue={(item) => {
                        if (!item.is_active) return 'PAUSED';
                        if (item.is_overdue) return 'OVERDUE';

                        return item.days_until_due !== null && item.days_until_due <= 30 ? 'DUE_SOON' : 'SCHEDULED';
                    }}
                />
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit schedule' : 'New maintenance schedule'}</DialogTitle>
                        <DialogDescription>
                            {editing
                                ? 'Adjust the task, cycle, or next due date.'
                                : 'Attach a recurring service task to an asset so it never depends on memory.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        {!editing && (
                            <div className="space-y-2">
                                <Label>Asset</Label>
                                <Select value={form.data.asset_id} onValueChange={(value) => form.setData('asset_id', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an asset" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {assets.map((asset) => (
                                            <SelectItem key={asset.id} value={String(asset.id)}>
                                                {asset.asset_tag} — {asset.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.errors.asset_id && <p className="text-destructive text-sm">{form.errors.asset_id}</p>}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="title">Task</Label>
                            <Input
                                id="title"
                                placeholder="Firmware patching and disk health check"
                                value={form.data.title}
                                onChange={(event) => form.setData('title', event.target.value)}
                            />
                            {form.errors.title && <p className="text-destructive text-sm">{form.errors.title}</p>}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Frequency</Label>
                                <Select value={form.data.frequency} onValueChange={(value: MaintenanceFrequency) => form.setData('frequency', value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {frequencies.map((frequency) => (
                                            <SelectItem key={frequency.value} value={frequency.value}>
                                                {frequency.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.errors.frequency && <p className="text-destructive text-sm">{form.errors.frequency}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="next_due_on">Next due</Label>
                                <Input
                                    id="next_due_on"
                                    type="date"
                                    value={form.data.next_due_on}
                                    onChange={(event) => form.setData('next_due_on', event.target.value)}
                                />
                                {form.errors.next_due_on && <p className="text-destructive text-sm">{form.errors.next_due_on}</p>}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="instructions">Instructions</Label>
                            <Textarea
                                id="instructions"
                                placeholder="What the technician should check and record."
                                value={form.data.instructions}
                                onChange={(event) => form.setData('instructions', event.target.value)}
                            />
                            {form.errors.instructions && <p className="text-destructive text-sm">{form.errors.instructions}</p>}
                        </div>
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                className="border-input accent-primary size-4 cursor-pointer rounded"
                                checked={form.data.is_active}
                                onChange={(event) => form.setData('is_active', event.target.checked)}
                            />
                            Active — include this plan in the due and overdue counts
                        </label>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Saving...' : editing ? 'Save changes' : 'Create schedule'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(completing)} onOpenChange={(open) => !open && setCompleting(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Log service</DialogTitle>
                        <DialogDescription>
                            {completing?.asset?.asset_tag} — {completing?.title}. The next visit is scheduled one cycle from today.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitCompletion} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="notes">Service notes</Label>
                            <Textarea
                                id="notes"
                                placeholder="Readings taken, parts replaced, anything the next technician should know."
                                value={completionForm.data.notes}
                                onChange={(event) => completionForm.setData('notes', event.target.value)}
                            />
                            {completionForm.errors.notes && <p className="text-destructive text-sm">{completionForm.errors.notes}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCompleting(null)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={completionForm.processing}>
                                {completionForm.processing ? 'Saving...' : 'Log service'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete schedule</DialogTitle>
                        <DialogDescription>
                            Remove "{deleting?.title}" from {deleting?.asset?.asset_tag}? Services already logged stay in the asset's history.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDeleting(null)}>
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" onClick={confirmDelete} disabled={form.processing}>
                            {form.processing ? 'Deleting...' : 'Delete schedule'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
