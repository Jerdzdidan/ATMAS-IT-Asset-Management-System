import { Pagination } from '@/components/pagination';
import { AssetConditionBadge, AssetStatusBadge } from '@/components/status-badges';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { type AssetCondition, type AssetStatus } from '@/types';
import { ArrowDown, ArrowUp, ArrowUpDown, SearchX } from 'lucide-react';

export type ReportColumnType = 'text' | 'numeric' | 'currency' | 'percent' | 'date' | 'datetime' | 'status' | 'condition' | 'badge' | 'notes';

export interface ReportColumn {
    key: string;
    label: string;
    type: ReportColumnType;
}

export interface ReportRows {
    data: Record<string, string | number | null>[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

export interface ReportSort {
    key: string | null;
    direction: 'asc' | 'desc';
}

interface ReportDataTableProps {
    columns: ReportColumn[];
    rows: ReportRows;
    sort: ReportSort;
    onPageChange: (page: number) => void;
    onSortChange: (key: string) => void;
    onReset: () => void;
}

const assetStatuses = new Set(['AVAILABLE', 'ASSIGNED', 'UNDER_REPAIR', 'RETIRED']);
const assetConditions = new Set(['NEW', 'GOOD', 'FAIR', 'POOR']);

/** Turns SCREAMING_SNAKE enum values into readable labels. */
function humanize(value: string): string {
    return value
        .toLowerCase()
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function formatDate(value: string): string {
    const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);

    return Number.isNaN(parsed.getTime())
        ? value
        : new Intl.DateTimeFormat('en-PH', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed);
}

function formatDateTime(value: string): string {
    const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T'));

    return Number.isNaN(parsed.getTime())
        ? value
        : new Intl.DateTimeFormat('en-PH', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(parsed);
}

function isNumericColumn(type: ReportColumnType): boolean {
    return type === 'numeric' || type === 'currency' || type === 'percent';
}

function ReportCell({ column, value }: { column: ReportColumn; value: string | number | null }) {
    // The audit count sheet leaves this column blank on purpose, for a tick in the field.
    if (column.key === 'verified') {
        return <span className="text-muted-foreground inline-block w-16 border-b border-dashed">&nbsp;</span>;
    }

    if (value === null || value === '') {
        return <span className="text-muted-foreground">—</span>;
    }

    const text = String(value);

    switch (column.type) {
        case 'status':
            return assetStatuses.has(text) ? <AssetStatusBadge status={text as AssetStatus} /> : <Badge variant="outline">{humanize(text)}</Badge>;
        case 'condition':
            return assetConditions.has(text) ? (
                <AssetConditionBadge condition={text as AssetCondition} />
            ) : (
                <Badge variant="outline">{humanize(text)}</Badge>
            );
        case 'badge':
            return (
                <Badge variant="secondary" className="font-normal">
                    {humanize(text)}
                </Badge>
            );
        case 'currency':
            return (
                <span className="tabular-nums">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value))}</span>
            );
        case 'percent':
            return <span className="tabular-nums">{Number(value).toLocaleString('en-PH')}%</span>;
        case 'numeric':
            return <span className="tabular-nums">{Number(value).toLocaleString('en-PH')}</span>;
        case 'date':
            return <span className="whitespace-nowrap">{formatDate(text)}</span>;
        case 'datetime':
            return <span className="whitespace-nowrap">{formatDateTime(text)}</span>;
        case 'notes':
            return (
                <span className="block max-w-56 truncate" title={text}>
                    {text}
                </span>
            );
        default:
            return <span className="whitespace-nowrap">{text}</span>;
    }
}

export function ReportDataTable({ columns, rows, sort, onPageChange, onSortChange, onReset }: ReportDataTableProps) {
    if (rows.total === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center">
                <span className="bg-muted mb-4 flex size-14 items-center justify-center rounded-2xl">
                    <SearchX className="text-muted-foreground size-6" />
                </span>
                <h3 className="text-lg font-semibold">No records match</h3>
                <p className="text-muted-foreground mt-1 max-w-sm text-sm leading-6">
                    Nothing fits the current filters. Try widening the date range or clearing a filter.
                </p>
                <Button type="button" variant="outline" className="mt-5 print:hidden" onClick={onReset}>
                    Reset filters
                </Button>
            </div>
        );
    }

    return (
        <div className="min-w-0 space-y-4">
            <div className="overflow-x-auto rounded-xl border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {columns.map((column) => {
                                const isSorted = sort.key === column.key;
                                const SortIcon = isSorted ? (sort.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

                                return (
                                    <TableHead key={column.key} className={cn(isNumericColumn(column.type) && 'text-right')}>
                                        <button
                                            type="button"
                                            onClick={() => onSortChange(column.key)}
                                            className={cn(
                                                'hover:text-foreground inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap transition-colors print:hidden',
                                                isSorted && 'text-foreground font-semibold',
                                            )}
                                        >
                                            {column.label}
                                            <SortIcon className={cn('size-3.5', isSorted ? 'opacity-100' : 'opacity-40')} />
                                        </button>
                                        <span className="hidden print:inline">{column.label}</span>
                                    </TableHead>
                                );
                            })}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.data.map((row, index) => (
                            <TableRow key={`${rows.current_page}-${index}`}>
                                {columns.map((column) => (
                                    <TableCell key={column.key} className={cn(isNumericColumn(column.type) && 'text-right')}>
                                        <ReportCell column={column} value={row[column.key] ?? null} />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <div className="text-muted-foreground flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between print:hidden">
                <span>
                    Showing {rows.from?.toLocaleString('en-PH')}–{rows.to?.toLocaleString('en-PH')} of {rows.total.toLocaleString('en-PH')} records
                </span>
                <Pagination page={rows.current_page} pageCount={rows.last_page} onPageChange={onPageChange} />
            </div>
        </div>
    );
}
