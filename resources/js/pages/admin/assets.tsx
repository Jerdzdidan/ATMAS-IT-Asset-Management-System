import { AdminDataTable, type AdminTableColumn } from '@/components/admin/admin-data-table';
import { AssetFormDialog } from '@/components/admin/asset-form-dialog';
import { DepartmentScopeNote } from '@/components/department-scope-note';
import { AssetConditionBadge, AssetStatusBadge } from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type AssetCondition, type AssetStatus, type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowDownUp, ImageOff, Plus, QrCode, Tags } from 'lucide-react';
import { useState, type ReactNode } from 'react';
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

export default function AssetsPage({ assets, categories, currentYear, nextTagNumber }: AssetsPageProps) {
    const { permissions } = usePage<SharedData>().props.auth;
    const [formOpen, setFormOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<ManagedAsset | null>(null);
    const [deletingAsset, setDeletingAsset] = useState<ManagedAsset | null>(null);
    const deleteForm = useForm<Record<string, never>>({});

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
        setFormOpen(true);
    }

    function openEdit(asset: ManagedAsset): void {
        setEditingAsset(asset);
        setFormOpen(true);
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

            <AssetFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                asset={editingAsset}
                categories={categories}
                tagSequence={{ currentYear, nextNumber: nextTagNumber }}
            />

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
