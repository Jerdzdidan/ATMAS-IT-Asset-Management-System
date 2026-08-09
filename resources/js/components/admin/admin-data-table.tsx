import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ArrowDown, ArrowUp, ArrowUpDown, FilterX, LayoutGrid, MoreHorizontal, Table2 } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';

export interface AdminTableColumn<T> {
    key: string;
    label: string;
    className?: string;
    render: (item: T) => React.ReactNode;
    sortValue?: (item: T) => string | number;
}

export interface AdminTableAction<T> {
    label: string;
    onSelect: (item: T) => void;
    disabled?: (item: T) => boolean;
}

export interface AdminTableFilter<T> {
    /** Identifies this filter's own state; never shown to the operator. */
    key: string;
    /** What this filter narrows on, as it reads in the field picker, e.g. "Category". */
    label: string;
    /** The entry that lets everything through, e.g. "All statuses". */
    allLabel: string;
    options: { value: string; label: string }[];
    getValue: (item: T) => string;
    /**
     * Keeps this filter in a dropdown of its own rather than folding it into the field picker.
     * Worth spending the space on for the one or two people reach for constantly.
     */
    standalone?: boolean;
    /** Widens a standalone select where the values run long. */
    className?: string;
}

interface AdminDataTableProps<T extends object> {
    data: T[];
    columns: AdminTableColumn<T>[];
    searchPlaceholder: string;
    getSearchText: (item: T) => string;
    getRowKey?: (item: T) => React.Key;
    onView?: (item: T) => void;
    onEdit?: (item: T) => void;
    onDelete?: (item: T) => void;
    deleteDisabled?: (item: T) => boolean;
    extraActions?: AdminTableAction<T>[];
    /** Narrowing dropdowns shown beside the search box; every one of them has to match. */
    filters?: AdminTableFilter<T>[];
    /**
     * Supplying a card renderer adds a table/grid switch to the toolbar. The actions node handed
     * back is the very menu the table row shows, so a card only decides where to place it.
     */
    renderCard?: (item: T, actions: React.ReactNode) => React.ReactNode;
    /**
     * Remembers the table/grid choice in the browser under this name, so it survives navigating
     * away and back. Each table needs its own name; without one the choice is not kept.
     */
    viewStorageKey?: string;
}

/** A select needs a non-empty value to stand for "no column chosen" and "no narrowing". */
const unsortedValue = 'NONE';
const allValue = 'ALL';

/** Namespaced so one table's remembered view cannot collide with another's. */
function viewStorageName(key: string): string {
    return `admin-table-view.${key}`;
}

export function AdminDataTable<T extends object>({
    data,
    columns,
    searchPlaceholder,
    getSearchText,
    getRowKey,
    onView,
    onEdit,
    onDelete,
    deleteDisabled,
    extraActions,
    filters,
    renderCard,
    viewStorageKey,
}: AdminDataTableProps<T>) {
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(1);
    // Keyed by filter; a key with no entry yet is letting everything through.
    const [filterValues, setFilterValues] = useState<Record<string, string>>({});
    // Which of the folded filters the value picker is currently pointed at.
    const [chosenField, setChosenField] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'table' | 'grid'>(() =>
        typeof window !== 'undefined' && viewStorageKey && localStorage.getItem(viewStorageName(viewStorageKey)) === 'grid' ? 'grid' : 'table',
    );

    const showsGrid = Boolean(renderCard) && viewMode === 'grid';
    // Cards sit three to a row, so a multiple of both column counts fills the last row evenly.
    const pageSize = showsGrid ? 12 : 10;

    const filtered = useMemo(() => {
        const normalized = search.trim().toLowerCase();
        const matches = data.filter((item) => {
            const matchesSearch = !normalized || getSearchText(item).toLowerCase().includes(normalized);
            const matchesFilters = (filters ?? []).every((candidate) => {
                const chosen = filterValues[candidate.key] ?? allValue;

                return chosen === allValue || candidate.getValue(item) === chosen;
            });

            return matchesSearch && matchesFilters;
        });
        const column = columns.find((candidate) => candidate.key === sortKey);

        if (column?.sortValue) {
            matches.sort((left, right) => {
                const leftValue = column.sortValue?.(left) ?? '';
                const rightValue = column.sortValue?.(right) ?? '';
                const comparison = String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true });

                return sortDirection === 'asc' ? comparison : -comparison;
            });
        }

        return matches;
    }, [columns, data, filterValues, filters, getSearchText, search, sortDirection, sortKey]);

    const sortableColumns = columns.filter((column) => column.sortValue);
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    function changeSort(key: string): void {
        if (sortKey === key) {
            setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
        setPage(1);
    }

    function sortIcon(key: string): React.ReactNode {
        if (sortKey !== key) return <ArrowUpDown className="size-3.5" />;
        return sortDirection === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
    }

    function rowKey(item: T): React.Key {
        return getRowKey ? getRowKey(item) : (item as { id: number }).id;
    }

    const pinned = (filters ?? []).filter((candidate) => candidate.standalone);
    const foldable = (filters ?? []).filter((candidate) => !candidate.standalone);
    // A field picker offering a single choice is just a dropdown with an extra click in front of it.
    const foldedFilters = foldable.length > 1 ? foldable : [];
    const standaloneFilters = foldable.length > 1 ? pinned : [...pinned, ...foldable];
    const activeField = foldedFilters.find((candidate) => candidate.key === chosenField) ?? null;
    const activeFilterCount = (filters ?? []).filter((candidate) => (filterValues[candidate.key] ?? allValue) !== allValue).length;
    /*
     * A read-only role is handed none of these, and an Actions column holding nothing but an empty
     * menu on every row is worse than no column: it takes width from the data and invites a click
     * that does nothing. So the column comes and goes with its contents.
     */
    const hasRowActions = Boolean(onView || onEdit || onDelete || extraActions?.length);

    function changeFilter(key: string, value: string): void {
        setFilterValues((current) => ({ ...current, [key]: value }));
        setPage(1);
    }

    /**
     * Point the value picker at a different field.
     *
     * The folded filters narrow one at a time, so whatever the previous field was holding is
     * dropped — leaving it applied would keep narrowing the table from a control nobody can see.
     */
    function changeField(key: string): void {
        setChosenField(key === unsortedValue ? null : key);
        setFilterValues((current) => {
            const next = { ...current };
            foldedFilters.forEach((candidate) => delete next[candidate.key]);

            return next;
        });
        setPage(1);
    }

    function clearFilters(): void {
        setFilterValues({});
        setChosenField(null);
        setPage(1);
    }

    /**
     * Turn the page and go back to the top.
     *
     * The pager sits below the last row, so paging from the foot of a long list would otherwise
     * leave the reader staring at the bottom of records they have already moved past.
     */
    function changePage(next: number): void {
        setPage(next);

        if (typeof window === 'undefined') {
            return;
        }

        const reducesMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reducesMotion ? 'auto' : 'smooth' });
    }

    function changeViewMode(next: 'table' | 'grid'): void {
        setViewMode(next);
        setPage(1);

        if (viewStorageKey && typeof window !== 'undefined') {
            localStorage.setItem(viewStorageName(viewStorageKey), next);
        }
    }

    /** The per-record menu, shared by the table's last column and by whatever a card does with it. */
    function rowActions(item: T): React.ReactNode {
        if (!hasRowActions) {
            return null;
        }

        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" aria-label="Open actions">
                        <MoreHorizontal />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {onView && <DropdownMenuItem onClick={() => onView(item)}>View</DropdownMenuItem>}
                    {extraActions?.map((action) => (
                        <DropdownMenuItem key={action.label} disabled={action.disabled?.(item)} onClick={() => action.onSelect(item)}>
                            {action.label}
                        </DropdownMenuItem>
                    ))}
                    {onEdit && <DropdownMenuItem onClick={() => onEdit(item)}>Edit</DropdownMenuItem>}
                    {onDelete && (
                        <DropdownMenuItem disabled={deleteDisabled?.(item)} onClick={() => onDelete(item)}>
                            Delete
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Input
                    value={search}
                    onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                    }}
                    placeholder={searchPlaceholder}
                    className="sm:w-64"
                />
                {standaloneFilters.map((candidate) => (
                    <Select
                        key={candidate.key}
                        value={filterValues[candidate.key] ?? allValue}
                        onValueChange={(value) => changeFilter(candidate.key, value)}
                    >
                        <SelectTrigger className={candidate.className ?? 'w-full sm:w-48'}>
                            <SelectValue placeholder={candidate.allLabel} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={allValue}>{candidate.allLabel}</SelectItem>
                            {candidate.options.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ))}
                {foldedFilters.length > 0 && (
                    <Select value={chosenField ?? unsortedValue} onValueChange={changeField}>
                        <SelectTrigger className="w-full sm:w-44">
                            <SelectValue placeholder="Filter by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={unsortedValue}>Filter by…</SelectItem>
                            {foldedFilters.map((candidate) => (
                                <SelectItem key={candidate.key} value={candidate.key}>
                                    {candidate.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                {activeField && (
                    <Combobox
                        // Remounted per field so the typed query never carries across a switch.
                        key={activeField.key}
                        value={filterValues[activeField.key] ?? ''}
                        options={activeField.options}
                        onValueChange={(value) => changeFilter(activeField.key, value === '' ? allValue : value)}
                        placeholder={activeField.allLabel}
                        emptyMessage={`No ${activeField.label.toLowerCase()} matches that.`}
                        className="w-full sm:w-60"
                    />
                )}
                {activeFilterCount > 0 && (
                    <Button type="button" variant="ghost" onClick={clearFilters}>
                        <FilterX /> Clear {activeFilterCount === 1 ? 'filter' : `${activeFilterCount} filters`}
                    </Button>
                )}
                {/* Cards have no column headers to click, so sorting needs its own control there. */}
                {showsGrid && sortableColumns.length > 0 && (
                    <div className="flex gap-2">
                        <Select
                            value={sortKey ?? unsortedValue}
                            onValueChange={(value) => {
                                setSortKey(value === unsortedValue ? null : value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={unsortedValue}>Default order</SelectItem>
                                {sortableColumns.map((column) => (
                                    <SelectItem key={column.key} value={column.key}>
                                        Sort by {column.label.toLowerCase()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={sortKey === null}
                            aria-label={sortDirection === 'asc' ? 'Sort descending' : 'Sort ascending'}
                            onClick={() => setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))}
                        >
                            {sortDirection === 'asc' ? <ArrowUp /> : <ArrowDown />}
                        </Button>
                    </div>
                )}
                {renderCard && (
                    <ToggleGroup
                        type="single"
                        value={viewMode}
                        variant="outline"
                        aria-label="Record view"
                        className="rounded-md border p-0.5 sm:ml-auto"
                        onValueChange={(value) => {
                            // Empty means the active item was clicked again; a view is always needed.
                            if (!value) return;
                            changeViewMode(value as 'table' | 'grid');
                        }}
                    >
                        <ToggleGroupItem value="table" aria-label="Table view" className="gap-2 px-3">
                            <Table2 />
                            <span className="hidden sm:inline">Table</span>
                        </ToggleGroupItem>
                        <ToggleGroupItem value="grid" aria-label="Grid view" className="gap-2 px-3">
                            <LayoutGrid />
                            <span className="hidden sm:inline">Grid</span>
                        </ToggleGroupItem>
                    </ToggleGroup>
                )}
            </div>
            {showsGrid && renderCard ? (
                visibleRows.length === 0 ? (
                    <div className="text-muted-foreground rounded-md border p-10 text-center text-sm">No records found.</div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {visibleRows.map((item) => (
                            <Fragment key={rowKey(item)}>{renderCard(item, rowActions(item))}</Fragment>
                        ))}
                    </div>
                )
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {columns.map((column) => (
                                    <TableHead key={column.key} className={column.className}>
                                        {column.sortValue ? (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="-ml-3 h-8"
                                                onClick={() => changeSort(column.key)}
                                            >
                                                {column.label}
                                                {sortIcon(column.key)}
                                            </Button>
                                        ) : (
                                            column.label
                                        )}
                                    </TableHead>
                                ))}
                                {hasRowActions && <TableHead className="w-16 text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleRows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length + (hasRowActions ? 1 : 0)} className="text-muted-foreground h-24 text-center">
                                        No records found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                visibleRows.map((item) => (
                                    <TableRow key={rowKey(item)}>
                                        {columns.map((column) => (
                                            <TableCell key={column.key} className={column.className}>
                                                {column.render(item)}
                                            </TableCell>
                                        ))}
                                        {hasRowActions && <TableCell className="text-right">{rowActions(item)}</TableCell>}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
            <div className="text-muted-foreground flex items-center justify-between text-sm">
                <span>
                    {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filtered.length)} of{' '}
                    {filtered.length}
                </span>
                <Pagination page={currentPage} pageCount={pageCount} onPageChange={changePage} />
            </div>
        </div>
    );
}
