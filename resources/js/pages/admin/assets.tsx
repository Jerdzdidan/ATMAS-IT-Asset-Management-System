import { AdminDataTable, type AdminTableColumn } from '@/components/admin/admin-data-table';
import { DepartmentScopeNote } from '@/components/department-scope-note';
import { AssetConditionBadge, AssetStatusBadge } from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type AssetCondition, type AssetStatus, type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowDownUp, ImageOff, Plus, QrCode, Tags } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';

interface AssetCategoryOption {
    id: number;
    name: string;
}

interface ManagedAsset {
    id: number;
    asset_tag: string;
    name: string;
    asset_category_id: number;
    department_id: number | null;
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
    primary_photo: { id: number; url: string } | null;
    current_assignment: {
        id: number;
        assigned_at: string;
        user: { id: number; name: string; employee_code: string | null } | null;
    } | null;
}

type AssetFormData = {
    name: string;
    asset_category_id: string;
    brand: string;
    model: string;
    serial_number: string;
    location: string;
    condition: AssetCondition;
    purchase_date: string;
    warranty_expires_at: string;
    purchase_cost: string;
    remarks: string;
};

interface AssetsPageProps {
    assets: ManagedAsset[];
    categories: AssetCategoryOption[];
    currentYear: number;
    nextTagNumber: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Assets', href: '/admin/assets' },
];

/** Stands for "no department" or "nobody" in a filter, since a select value cannot be empty. */
const noneFilterValue = 'NONE';

/**
 * The distinct values actually present in the register, alphabetised.
 *
 * Built from the rows rather than from the full category and department lists so a filter never
 * offers a choice that would empty the table, and so a department head only sees their own.
 */
function presentOptions(values: (string | null | undefined)[]): { value: string; label: string }[] {
    return [...new Set(values.filter((value): value is string => Boolean(value)))]
        .sort((left, right) => left.localeCompare(right))
        .map((value) => ({ value, label: value }));
}

const emptyForm: AssetFormData = {
    name: '',
    asset_category_id: '',
    brand: '',
    model: '',
    serial_number: '',
    location: '',
    condition: 'GOOD',
    purchase_date: '',
    warranty_expires_at: '',
    purchase_cost: '',
    remarks: '',
};

export default function AssetsPage({ assets, categories, currentYear, nextTagNumber }: AssetsPageProps) {
    const { permissions } = usePage<SharedData>().props.auth;
    const [formOpen, setFormOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<ManagedAsset | null>(null);
    const [deletingAsset, setDeletingAsset] = useState<ManagedAsset | null>(null);
    const form = useForm<AssetFormData>(emptyForm);
    const deleteForm = useForm<Record<string, never>>({});

    const parsedYear = Number(form.data.purchase_date.slice(0, 4));
    const tagYear = Number.isInteger(parsedYear) && parsedYear > 1900 ? parsedYear : currentYear;
    // Only the running total for the current year is known here, so older years show a placeholder.
    const previewTag = `${tagYear}-${tagYear === currentYear ? String(nextTagNumber).padStart(4, '0') : '####'}`;

    const columns: AdminTableColumn<ManagedAsset>[] = [
        {
            key: 'photo',
            label: '',
            className: 'w-12',
            render: (asset) =>
                asset.primary_photo ? (
                    <img src={asset.primary_photo.url} alt="" className="size-9 rounded border object-cover" />
                ) : (
                    <div className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded border">
                        <ImageOff className="size-4" />
                    </div>
                ),
        },
        {
            key: 'asset_tag',
            label: 'Asset tag',
            render: (asset) => <span className="font-medium">{asset.asset_tag}</span>,
            sortValue: (asset) => asset.asset_tag,
        },
        { key: 'name', label: 'Name', render: (asset) => asset.name, sortValue: (asset) => asset.name },
        {
            key: 'category',
            label: 'Category',
            render: (asset) => asset.category?.name ?? '—',
            sortValue: (asset) => asset.category?.name ?? '',
        },
        {
            key: 'department',
            label: 'Department',
            render: (asset) => asset.department?.name ?? <span className="text-muted-foreground">—</span>,
            sortValue: (asset) => asset.department?.name ?? '',
        },
        {
            key: 'holder',
            label: 'Assigned to',
            render: (asset) => asset.current_assignment?.user?.name ?? <span className="text-muted-foreground">Unassigned</span>,
            sortValue: (asset) => asset.current_assignment?.user?.name ?? '',
        },
        {
            key: 'condition',
            label: 'Condition',
            render: (asset) => <AssetConditionBadge condition={asset.condition} />,
            sortValue: (asset) => asset.condition,
        },
        {
            key: 'status',
            label: 'Status',
            render: (asset) => <AssetStatusBadge status={asset.status} />,
            sortValue: (asset) => asset.status,
        },
    ];

    function openCreate(): void {
        setEditingAsset(null);
        form.setData(emptyForm);
        form.clearErrors();
        setFormOpen(true);
    }

    function openEdit(asset: ManagedAsset): void {
        setEditingAsset(asset);
        form.setData({
            name: asset.name,
            asset_category_id: String(asset.asset_category_id),
            brand: asset.brand ?? '',
            model: asset.model ?? '',
            serial_number: asset.serial_number ?? '',
            location: asset.location ?? '',
            condition: asset.condition,
            purchase_date: asset.purchase_date ?? '',
            warranty_expires_at: asset.warranty_expires_at ?? '',
            purchase_cost: asset.purchase_cost ?? '',
            remarks: asset.remarks ?? '',
        });
        form.clearErrors();
        setFormOpen(true);
    }

    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setFormOpen(false);
                form.setData(emptyForm);
                toast.success(editingAsset ? 'Asset updated successfully.' : 'Asset registered successfully.');
            },
        };

        if (editingAsset) form.put(`/admin/assets/${editingAsset.id}`, options);
        else form.post('/admin/assets', options);
    }

    function confirmDelete(): void {
        if (!deletingAsset) return;
        deleteForm.delete(`/admin/assets/${deletingAsset.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeletingAsset(null);
                toast.success('Asset deleted successfully.');
            },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Asset register" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Asset register</h1>
                        <p className="text-muted-foreground">Track every hardware asset, its custodian, and its lifecycle status.</p>
                        <DepartmentScopeNote noun="hardware" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline">
                            <Link href="/admin/scan">
                                <QrCode /> Scan
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/admin/labels">
                                <Tags /> Labels
                            </Link>
                        </Button>
                        {permissions.manages_assets && (
                            <Button asChild variant="outline">
                                <Link href="/admin/import-export">
                                    <ArrowDownUp /> Import / Export
                                </Link>
                            </Button>
                        )}
                        {permissions.manages_assets && (
                            <Button onClick={openCreate}>
                                <Plus /> Register asset
                            </Button>
                        )}
                    </div>
                </div>
                <AdminDataTable
                    data={assets}
                    columns={columns}
                    searchPlaceholder="Search by tag, name, serial..."
                    getSearchText={(asset) =>
                        `${asset.asset_tag} ${asset.name} ${asset.brand ?? ''} ${asset.model ?? ''} ${asset.serial_number ?? ''} ${asset.category?.name ?? ''} ${asset.department?.name ?? ''} ${asset.current_assignment?.user?.name ?? ''}`
                    }
                    onView={(asset) => router.visit(`/admin/assets/${asset.id}`)}
                    onEdit={permissions.manages_assets ? openEdit : undefined}
                    onDelete={permissions.manages_assets ? setDeletingAsset : undefined}
                    filters={[
                        {
                            key: 'status',
                            label: 'Status',
                            allLabel: 'All statuses',
                            // The one filter worth a permanent dropdown: it is reached for constantly.
                            standalone: true,
                            className: 'w-full sm:w-40',
                            options: [
                                { value: 'AVAILABLE', label: 'Available' },
                                { value: 'ASSIGNED', label: 'Assigned' },
                                { value: 'UNDER_REPAIR', label: 'Under repair' },
                                { value: 'RETIRED', label: 'Retired' },
                            ],
                            getValue: (asset) => asset.status,
                        },
                        {
                            key: 'category',
                            label: 'Category',
                            allLabel: 'Any category',
                            options: presentOptions(assets.map((asset) => asset.category?.name)),
                            getValue: (asset) => asset.category?.name ?? noneFilterValue,
                        },
                        // A department head only ever sees one department, so the filter would be
                        // a dropdown with a single choice.
                        ...(permissions.is_department_scoped
                            ? []
                            : [
                                  {
                                      key: 'department',
                                      label: 'Department',
                                      allLabel: 'Any department',
                                      options: [
                                          ...presentOptions(assets.map((asset) => asset.department?.name)),
                                          { value: noneFilterValue, label: 'No department' },
                                      ],
                                      getValue: (asset: ManagedAsset) => asset.department?.name ?? noneFilterValue,
                                  },
                              ]),
                        {
                            key: 'condition',
                            label: 'Condition',
                            allLabel: 'Any condition',
                            options: [
                                { value: 'NEW', label: 'New' },
                                { value: 'GOOD', label: 'Good' },
                                { value: 'FAIR', label: 'Fair' },
                                { value: 'POOR', label: 'Poor' },
                            ],
                            getValue: (asset) => asset.condition,
                        },
                        {
                            key: 'holder',
                            label: 'Assigned to',
                            allLabel: 'Anyone',
                            options: [
                                { value: noneFilterValue, label: 'Unassigned' },
                                ...presentOptions(assets.map((asset) => asset.current_assignment?.user?.name)),
                            ],
                            getValue: (asset) => asset.current_assignment?.user?.name ?? noneFilterValue,
                        },
                    ]}
                    renderCard={(asset, actions) => (
                        <AssetCard asset={asset} actions={actions} onOpen={() => router.visit(`/admin/assets/${asset.id}`)} />
                    )}
                    viewStorageKey="assets"
                />
            </div>

            <Dialog open={formOpen} onOpenChange={(open) => !form.processing && setFormOpen(open)}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingAsset ? 'Edit asset' : 'Register asset'}</DialogTitle>
                        <DialogDescription>Record the identifiers, classification, and purchase details of the hardware.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2 sm:col-span-2">
                                <Label>Asset tag</Label>
                                <div className="bg-muted/50 text-foreground flex h-10 items-center rounded-md border px-3 font-mono text-sm">
                                    {editingAsset ? editingAsset.asset_tag : previewTag}
                                </div>
                                <p className="text-muted-foreground text-xs">
                                    {editingAsset
                                        ? 'Asset tags are permanent once issued so they keep matching the label on the device.'
                                        : 'Generated on save from the acquisition year and a running number.'}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="asset-name">Asset name</Label>
                                <Input id="asset-name" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} />
                                {form.errors.name && <p className="text-destructive text-sm">{form.errors.name}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={form.data.asset_category_id} onValueChange={(value) => form.setData('asset_category_id', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((category) => (
                                            <SelectItem key={category.id} value={String(category.id)}>
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.errors.asset_category_id && <p className="text-destructive text-sm">{form.errors.asset_category_id}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Department</Label>
                                <div className="bg-muted/50 flex h-10 items-center rounded-md border px-3 text-sm">
                                    {editingAsset?.department ? (
                                        editingAsset.department.name
                                    ) : (
                                        <span className="text-muted-foreground">None until issued</span>
                                    )}
                                </div>
                                <p className="text-muted-foreground text-xs">
                                    Taken from whoever holds the asset, so it cannot contradict the custody record. Issue the asset to someone to
                                    place it in their department.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>Condition</Label>
                                <Select value={form.data.condition} onValueChange={(value: AssetCondition) => form.setData('condition', value)}>
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
                                {form.errors.condition && <p className="text-destructive text-sm">{form.errors.condition}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="asset-brand">Brand</Label>
                                <Input id="asset-brand" value={form.data.brand} onChange={(event) => form.setData('brand', event.target.value)} />
                                {form.errors.brand && <p className="text-destructive text-sm">{form.errors.brand}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="asset-model">Model</Label>
                                <Input id="asset-model" value={form.data.model} onChange={(event) => form.setData('model', event.target.value)} />
                                {form.errors.model && <p className="text-destructive text-sm">{form.errors.model}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="asset-serial">Serial number</Label>
                                <Input
                                    id="asset-serial"
                                    value={form.data.serial_number}
                                    onChange={(event) => form.setData('serial_number', event.target.value.toUpperCase())}
                                />
                                {form.errors.serial_number && <p className="text-destructive text-sm">{form.errors.serial_number}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="asset-location">Location</Label>
                                <Input
                                    id="asset-location"
                                    placeholder="Caloocan Plant"
                                    value={form.data.location}
                                    onChange={(event) => form.setData('location', event.target.value)}
                                />
                                {form.errors.location && <p className="text-destructive text-sm">{form.errors.location}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="asset-purchase-date">Purchase date</Label>
                                <Input
                                    id="asset-purchase-date"
                                    type="date"
                                    value={form.data.purchase_date}
                                    onChange={(event) => form.setData('purchase_date', event.target.value)}
                                />
                                {form.errors.purchase_date && <p className="text-destructive text-sm">{form.errors.purchase_date}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="asset-warranty">Warranty expiry</Label>
                                <Input
                                    id="asset-warranty"
                                    type="date"
                                    value={form.data.warranty_expires_at}
                                    onChange={(event) => form.setData('warranty_expires_at', event.target.value)}
                                />
                                {form.errors.warranty_expires_at && <p className="text-destructive text-sm">{form.errors.warranty_expires_at}</p>}
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="asset-cost">Purchase cost</Label>
                                <Input
                                    id="asset-cost"
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    value={form.data.purchase_cost}
                                    onChange={(event) => form.setData('purchase_cost', event.target.value)}
                                />
                                {form.errors.purchase_cost && <p className="text-destructive text-sm">{form.errors.purchase_cost}</p>}
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="asset-remarks">Remarks</Label>
                                <Textarea
                                    id="asset-remarks"
                                    value={form.data.remarks}
                                    onChange={(event) => form.setData('remarks', event.target.value)}
                                />
                                {form.errors.remarks && <p className="text-destructive text-sm">{form.errors.remarks}</p>}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Saving...' : 'Save asset'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(deletingAsset)} onOpenChange={(open) => !open && setDeletingAsset(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete asset?</DialogTitle>
                        <DialogDescription>
                            This permanently removes {deletingAsset?.asset_tag}. Assets with custody or maintenance history must be retired instead.
                        </DialogDescription>
                    </DialogHeader>
                    {deleteForm.errors.asset && <p className="text-destructive text-sm">{deleteForm.errors.asset}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingAsset(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={deleteForm.processing}>
                            {deleteForm.processing ? 'Deleting...' : 'Delete asset'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

interface AssetCardProps {
    asset: ManagedAsset;
    actions: ReactNode;
    onOpen: () => void;
}

/** The grid-view counterpart of a table row: the photo first, then the same identifying columns. */
function AssetCard({ asset, actions, onOpen }: AssetCardProps) {
    const hardware = [asset.brand, asset.model].filter(Boolean).join(' ');
    const holder = asset.current_assignment?.user?.name;

    return (
        <Card className="focus-within:ring-ring group relative flex h-full flex-col overflow-hidden transition-shadow focus-within:ring-2 hover:shadow-md">
            {/*
                A stretched button rather than a click handler on the card itself: it keeps the
                whole surface clickable while staying reachable by keyboard. It sits above the text
                so a stray click never lands short, and the actions menu is lifted above it in turn.
            */}
            <button type="button" onClick={onOpen} className="absolute inset-0 z-10 cursor-pointer focus:outline-hidden">
                <span className="sr-only">View {asset.asset_tag}</span>
            </button>

            <div className="bg-muted flex aspect-[16/10] items-center justify-center overflow-hidden border-b">
                {asset.primary_photo ? (
                    <img src={asset.primary_photo.url} alt="" className="size-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                    <ImageOff className="text-muted-foreground size-8" />
                )}
            </div>

            <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="min-w-0">
                    <p className="text-muted-foreground font-mono text-xs">{asset.asset_tag}</p>
                    <p className="truncate font-medium">{asset.name}</p>
                    <p className="text-muted-foreground truncate text-sm">{hardware || (asset.serial_number ?? '—')}</p>
                </div>

                <dl className="grid gap-1 text-sm">
                    <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground shrink-0">Category</dt>
                        <dd className="truncate">{asset.category?.name ?? '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground shrink-0">Department</dt>
                        <dd className="truncate">{asset.department?.name ?? '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground shrink-0">Assigned to</dt>
                        <dd className="truncate">{holder ?? <span className="text-muted-foreground">Unassigned</span>}</dd>
                    </div>
                </dl>

                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap gap-2">
                        <AssetConditionBadge condition={asset.condition} />
                        <AssetStatusBadge status={asset.status} />
                    </div>
                    <div className="relative z-20">{actions}</div>
                </div>
            </div>
        </Card>
    );
}
