import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type AssetStatus, type BreadcrumbItem, type ReportPayload } from '@/types';
import { Head, router } from '@inertiajs/react';
import { FileSpreadsheet, FileText, RotateCcw } from 'lucide-react';

interface ReportDefinition {
    key: string;
    title: string;
    description: string;
    group: string;
    filters: string[];
}

interface ReportsPageProps {
    definitions: ReportDefinition[];
    report: ReportPayload;
    selected: string;
    filters: { department_id: number | null; category_id: number | null; status: string | null; from: string | null; to: string | null };
    departments: { id: number; name: string }[];
    categories: { id: number; name: string }[];
    statuses: { value: AssetStatus; label: string }[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Reports', href: '/admin/reports' },
];

/** The Select component cannot hold an empty value, so "no filter" needs a stand-in. */
const ANY = 'ANY';

export default function ReportsPage({ definitions, report, selected, filters, departments, categories, statuses }: ReportsPageProps) {
    const definition = definitions.find((candidate) => candidate.key === selected);
    const supports = (filter: string): boolean => definition?.filters.includes(filter) ?? false;

    /** Everything the current view is showing, ready to hang off a link or a visit. */
    function currentQuery(overrides: Record<string, string | number | null> = {}): Record<string, string> {
        const merged: Record<string, string | number | null> = {
            report: selected,
            department_id: filters.department_id,
            category_id: filters.category_id,
            status: filters.status,
            from: filters.from,
            to: filters.to,
            ...overrides,
        };

        return Object.fromEntries(
            Object.entries(merged)
                .filter(([, value]) => value !== null && value !== '' && value !== ANY)
                .map(([key, value]) => [key, String(value)]),
        );
    }

    function apply(overrides: Record<string, string | number | null>): void {
        router.get('/admin/reports', currentQuery(overrides), { preserveState: true, preserveScroll: true, replace: true });
    }

    function exportUrl(format: 'excel' | 'pdf'): string {
        return `/admin/reports/${format}?${new URLSearchParams(currentQuery()).toString()}`;
    }

    const groups = Array.from(new Set(definitions.map((item) => item.group)));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reports" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
                    <p className="text-muted-foreground">
                        Standard reports for IT, finance, management, and auditors. Every one exports to Excel or a signed-off PDF.
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                    <nav className="flex flex-col gap-5">
                        {groups.map((group) => (
                            <div key={group}>
                                <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">{group}</p>
                                <div className="flex flex-col gap-1">
                                    {definitions
                                        .filter((item) => item.group === group)
                                        .map((item) => (
                                            <button
                                                key={item.key}
                                                type="button"
                                                onClick={() => apply({ report: item.key })}
                                                className={cn(
                                                    'cursor-pointer rounded-md px-3 py-2 text-left text-sm transition-colors',
                                                    item.key === selected
                                                        ? 'bg-primary text-primary-foreground font-medium'
                                                        : 'hover:bg-accent hover:text-accent-foreground',
                                                )}
                                            >
                                                {item.title}
                                            </button>
                                        ))}
                                </div>
                            </div>
                        ))}
                    </nav>

                    <div className="flex min-w-0 flex-col gap-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">{report.title}</h2>
                                <p className="text-muted-foreground text-sm">{report.description}</p>
                            </div>
                            <div className="flex shrink-0 gap-2">
                                <Button asChild variant="outline">
                                    <a href={exportUrl('excel')}>
                                        <FileSpreadsheet /> Excel
                                    </a>
                                </Button>
                                <Button asChild>
                                    <a href={exportUrl('pdf')}>
                                        <FileText /> PDF
                                    </a>
                                </Button>
                            </div>
                        </div>

                        {definition && definition.filters.length > 0 && (
                            <div className="bg-card grid gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
                                {supports('department') && (
                                    <div className="space-y-2">
                                        <Label>Department</Label>
                                        <Select
                                            value={filters.department_id ? String(filters.department_id) : ANY}
                                            onValueChange={(value) => apply({ department_id: value === ANY ? null : value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={ANY}>All departments</SelectItem>
                                                {departments.map((department) => (
                                                    <SelectItem key={department.id} value={String(department.id)}>
                                                        {department.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                {supports('category') && (
                                    <div className="space-y-2">
                                        <Label>Category</Label>
                                        <Select
                                            value={filters.category_id ? String(filters.category_id) : ANY}
                                            onValueChange={(value) => apply({ category_id: value === ANY ? null : value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={ANY}>All categories</SelectItem>
                                                {categories.map((category) => (
                                                    <SelectItem key={category.id} value={String(category.id)}>
                                                        {category.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                {supports('status') && (
                                    <div className="space-y-2">
                                        <Label>Status</Label>
                                        <Select
                                            value={filters.status ?? ANY}
                                            onValueChange={(value) => apply({ status: value === ANY ? null : value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={ANY}>All statuses</SelectItem>
                                                {statuses.map((status) => (
                                                    <SelectItem key={status.value} value={status.value}>
                                                        {status.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                {supports('dates') && (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="report-from">From</Label>
                                            <Input
                                                id="report-from"
                                                type="date"
                                                value={filters.from ?? ''}
                                                onChange={(event) => apply({ from: event.target.value || null })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="report-to">To</Label>
                                            <Input
                                                id="report-to"
                                                type="date"
                                                value={filters.to ?? ''}
                                                onChange={(event) => apply({ to: event.target.value || null })}
                                            />
                                        </div>
                                    </>
                                )}
                                <div className="flex items-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            router.get(
                                                '/admin/reports',
                                                { report: selected },
                                                { preserveState: true, preserveScroll: true, replace: true },
                                            )
                                        }
                                    >
                                        <RotateCcw /> Clear filters
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                            {report.summary.map((figure) => (
                                <Card key={figure.label}>
                                    <CardContent className="p-4">
                                        <p className="text-muted-foreground text-xs tracking-wide uppercase">{figure.label}</p>
                                        <p className="text-primary mt-1 text-xl font-semibold">{figure.value}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <div className="overflow-x-auto rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {report.columns.map((column) => (
                                            <TableHead key={column.key} className={column.align === 'right' ? 'text-right' : undefined}>
                                                {column.label}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {report.rows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={report.columns.length} className="text-muted-foreground h-24 text-center">
                                                No records match the selected filters.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        report.rows.map((row, index) => (
                                            <TableRow key={index}>
                                                {report.columns.map((column) => (
                                                    <TableCell
                                                        key={column.key}
                                                        className={cn('whitespace-nowrap', column.align === 'right' && 'text-right')}
                                                    >
                                                        {row[column.key] ?? ''}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <p className="text-muted-foreground text-xs">{report.rows.length} record(s) in this report.</p>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
