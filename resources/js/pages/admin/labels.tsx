import { Pagination } from '@/components/pagination';
import { AssetStatusBadge } from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type AssetStatus, type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, FileDown, SearchX, Tags } from 'lucide-react';
import { useMemo, useState } from 'react';

interface LabelAsset {
    id: number;
    asset_tag: string;
    name: string;
    serial_number: string | null;
    status: AssetStatus;
    category: string | null;
    department: string | null;
}

interface LabelsPageProps {
    assets: LabelAsset[];
    categories: string[];
    departments: string[];
    initialSelection: number[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Assets', href: '/admin/assets' },
    { title: 'Labels', href: '/admin/labels' },
];

const all = 'ALL';
const pageSize = 12;

/** Rendering every selected label at once would fire a request per sticker. */
const previewLimit = 12;

export default function LabelsPage({ assets, categories, departments, initialSelection }: LabelsPageProps) {
    const { permissions } = usePage<SharedData>().props.auth;
    const inService = useMemo(() => assets.filter((asset) => asset.status !== 'RETIRED').map((asset) => asset.id), [assets]);

    // Everything in service starts ticked, so the common "print the lot" run is still one click.
    const [selected, setSelected] = useState<Set<number>>(() => new Set(initialSelection.length > 0 ? initialSelection : inService));
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState(all);
    const [department, setDepartment] = useState(all);
    const [status, setStatus] = useState(all);
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        const needle = search.trim().toLowerCase();

        return assets.filter((asset) => {
            const haystack = `${asset.asset_tag} ${asset.name} ${asset.serial_number ?? ''}`.toLowerCase();

            return (
                (needle === '' || haystack.includes(needle)) &&
                (category === all || asset.category === category) &&
                (department === all || asset.department === department) &&
                (status === all || asset.status === status)
            );
        });
    }, [assets, category, department, search, status]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const selectedAssets = useMemo(() => assets.filter((asset) => selected.has(asset.id)), [assets, selected]);
    const filteredAllSelected = filtered.length > 0 && filtered.every((asset) => selected.has(asset.id));

    function toggle(id: number): void {
        setSelected((current) => {
            const next = new Set(current);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    }

    /** Applies to everything the filters currently match, not just the rows on this page. */
    function toggleFiltered(): void {
        setSelected((current) => {
            const next = new Set(current);
            filtered.forEach((asset) => (filteredAllSelected ? next.delete(asset.id) : next.add(asset.id)));

            return next;
        });
    }

    function resetFilters(): void {
        setSearch('');
        setCategory(all);
        setDepartment(all);
        setStatus(all);
        setPage(1);
    }

    /**
     * The whole in-service register is the server's own default, so that selection needs no
     * parameters at all — which keeps the everyday case off a huge query string.
     */
    const downloadUrl = useMemo(() => {
        const isDefault = selected.size === inService.length && inService.every((id) => selected.has(id));

        return isDefault ? '/admin/labels/download' : `/admin/labels/download?assets=${[...selected].join(',')}`;
    }, [inService, selected]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Asset labels" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <Link
                    href="/admin/assets"
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -mb-2 inline-flex w-fit items-center gap-1.5 rounded-md text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
                >
                    <ArrowLeft className="size-4" />
                    Back to asset register
                </Link>

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Asset labels</h1>
                        <p className="text-muted-foreground">
                            Pick the assets you need stickers for, then download the sheet — three labels across, ready for label stock.
                        </p>
                    </div>
                    {/* An anchor ignores `disabled`, so the empty state renders as a real button instead. */}
                    {selected.size === 0 ? (
                        <Button disabled>
                            <FileDown /> Download PDF
                        </Button>
                    ) : (
                        <Button asChild>
                            <a href={downloadUrl}>
                                <FileDown /> Download PDF ({selected.size})
                            </a>
                        </Button>
                    )}
                </div>

                <Card>
                    <CardContent className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-2">
                            <Label htmlFor="label-search">Search</Label>
                            <Input
                                id="label-search"
                                value={search}
                                placeholder="Tag, name, or serial"
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select
                                value={category}
                                onValueChange={(value) => {
                                    setCategory(value);
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={all}>All categories</SelectItem>
                                    {categories.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {/* A department head is confined to one department, so the picker would
                            offer a single choice that changes nothing. */}
                        {!permissions.is_department_scoped && (
                            <div className="space-y-2">
                                <Label>Department</Label>
                                <Select
                                    value={department}
                                    onValueChange={(value) => {
                                        setDepartment(value);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={all}>All departments</SelectItem>
                                        {departments.map((option) => (
                                            <SelectItem key={option} value={option}>
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                                value={status}
                                onValueChange={(value) => {
                                    setStatus(value);
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={all}>All statuses</SelectItem>
                                    {['AVAILABLE', 'ASSIGNED', 'UNDER_REPAIR', 'RETIRED'].map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option.replace('_', ' ')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-muted-foreground text-sm">
                        <span className="text-foreground font-semibold">{selected.size}</span> of {assets.length} selected
                        {filtered.length !== assets.length && ` · ${filtered.length} match the filters`}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={toggleFiltered} disabled={filtered.length === 0}>
                            {filteredAllSelected ? 'Deselect' : 'Select'} {filtered.length === assets.length ? 'all' : 'filtered'}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setSelected(new Set())} disabled={selected.size === 0}>
                            Clear selection
                        </Button>
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center">
                        <span className="bg-muted mb-4 flex size-14 items-center justify-center rounded-2xl">
                            <SearchX className="text-muted-foreground size-6" />
                        </span>
                        <h3 className="text-lg font-semibold">No assets match</h3>
                        <p className="text-muted-foreground mt-1 max-w-sm text-sm leading-6">Try widening the search or clearing a filter.</p>
                        <Button type="button" variant="outline" className="mt-5" onClick={resetFilters}>
                            Reset filters
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Checkbox
                                                checked={filteredAllSelected}
                                                onCheckedChange={toggleFiltered}
                                                aria-label="Select all filtered assets"
                                                className="cursor-pointer"
                                            />
                                        </TableHead>
                                        <TableHead>Asset tag</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead>Serial</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {visible.map((asset) => (
                                        <TableRow
                                            key={asset.id}
                                            className="hover:bg-muted/50 cursor-pointer"
                                            onClick={() => toggle(asset.id)}
                                            data-state={selected.has(asset.id) ? 'selected' : undefined}
                                        >
                                            <TableCell onClick={(event) => event.stopPropagation()}>
                                                <Checkbox
                                                    checked={selected.has(asset.id)}
                                                    onCheckedChange={() => toggle(asset.id)}
                                                    aria-label={`Select ${asset.asset_tag}`}
                                                    className="cursor-pointer"
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{asset.asset_tag}</TableCell>
                                            <TableCell>{asset.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{asset.category ?? '—'}</TableCell>
                                            <TableCell className="text-muted-foreground">{asset.department ?? '—'}</TableCell>
                                            <TableCell className="text-muted-foreground">{asset.serial_number ?? '—'}</TableCell>
                                            <TableCell>
                                                <AssetStatusBadge status={asset.status} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {pageCount > 1 && (
                            <div className="text-muted-foreground flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                                <span>
                                    {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
                                </span>
                                <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
                            </div>
                        )}
                    </>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Tags className="size-4" /> Preview
                        </CardTitle>
                        <CardDescription>
                            {selectedAssets.length === 0
                                ? 'Nothing selected yet.'
                                : selectedAssets.length > previewLimit
                                  ? `The first ${previewLimit} of ${selectedAssets.length} labels. All ${selectedAssets.length} are included in the PDF.`
                                  : `${selectedAssets.length} label(s), exactly as they will print.`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {selectedAssets.length === 0 ? (
                            <p className="text-muted-foreground py-6 text-center text-sm">Tick an asset above to see its label here.</p>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {selectedAssets.slice(0, previewLimit).map((asset) => (
                                    <img
                                        key={asset.id}
                                        src={`/admin/assets/${asset.id}/label`}
                                        alt={`Label for ${asset.asset_tag}`}
                                        loading="lazy"
                                        className="w-full rounded-md border bg-white"
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
