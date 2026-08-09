import { ReportChartCard, type ReportChart } from '@/components/admin/reports/report-chart';
import { ReportDataTable, type ReportColumn, type ReportRows } from '@/components/admin/reports/report-data-table';
import { ReportKpiCards, type ReportKpi } from '@/components/admin/reports/report-kpi-cards';
import { ReportPdfDocument, pdfDocumentWidth, type ReportPdfPayload } from '@/components/admin/reports/report-pdf-document';
import { ReportSwitcher, type SwitcherReport } from '@/components/admin/reports/report-switcher';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type AssetStatus, type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { CalendarRange, Download, FileDown, LayoutGrid, LoaderCircle, RotateCcw, X } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

type ReportFilters = {
    department_id: number | null;
    category_id: number | null;
    status: string | null;
    from: string | null;
    to: string | null;
};

/** Which optional filter controls this report supports, supplied by the backend catalogue. */
type AvailableFilter = 'department' | 'category' | 'status' | 'dates';

export interface AdminReportPageProps {
    report: {
        key: string;
        slug: string;
        url: string;
        title: string;
        answers: string;
        description: string;
        category_label: string;
        default_sort: { key: string; direction: string };
    };
    title: string;
    description: string;
    filters: ReportFilters;
    filterOptions: {
        departments: { id: number; name: string }[];
        categories: { id: number; name: string }[];
        statuses: { value: AssetStatus; label: string }[];
    };
    availableFilters: AvailableFilter[];
    switcher: SwitcherReport[];
    period: string;
    kpis: ReportKpi[];
    /** Null on listings and count sheets, where a graph would be decoration. */
    chart: ReportChart | null;
    columns: ReportColumn[];
    rows: ReportRows;
}

interface AdminReportPageComponentProps extends AdminReportPageProps {
    reportUrl: string;
}

/** The Select component cannot hold an empty value, so "no filter" needs a stand-in. */
const none = 'ALL';

function queryFrom(filters: ReportFilters, extra: Record<string, string | number | null> = {}): Record<string, string> {
    return Object.entries({ ...filters, ...extra })
        .filter(([, value]) => value !== null && value !== '')
        .reduce<Record<string, string>>((carry, [key, value]) => ({ ...carry, [key]: String(value) }), {});
}

export function AdminReportPage({
    report,
    title,
    description,
    filters,
    filterOptions,
    availableFilters,
    switcher,
    period,
    kpis,
    chart,
    columns,
    rows,
    reportUrl,
}: AdminReportPageComponentProps) {
    const { name: organisation } = usePage<SharedData>().props;
    const [form, setForm] = useState(filters);
    const [perPage, setPerPage] = useState(25);
    const [busy, setBusy] = useState(false);
    const [pdfPayload, setPdfPayload] = useState<ReportPdfPayload | null>(null);
    const [buildingPdf, setBuildingPdf] = useState(false);
    const pdfRef = useRef<HTMLDivElement | null>(null);
    const supports = (filter: AvailableFilter): boolean => availableFilters.includes(filter);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Reports', href: '/admin/reports' },
        { title, href: reportUrl },
    ];

    /**
     * Navigation always starts from the filters the server actually applied, so paging or
     * sorting can never silently pick up half-edited form state.
     */
    function visit(extra: Record<string, string | number | null>, base: ReportFilters = filters): void {
        router.get(reportUrl, queryFrom(base, { per_page: perPage, ...extra }), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setBusy(true),
            onFinish: () => setBusy(false),
        });
    }

    function applyFilters(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        visit({}, form);
    }

    function resetFilters(): void {
        setForm({ department_id: null, category_id: null, status: null, from: null, to: null });
        router.get(reportUrl, {}, { preserveScroll: true, replace: true });
    }

    function changeSort(key: string): void {
        const currentSort = new URLSearchParams(window.location.search).get('sort');
        const currentDirection = new URLSearchParams(window.location.search).get('direction');
        const direction = currentSort === key && currentDirection === 'desc' ? 'asc' : 'desc';

        visit({ sort: key, direction });
    }

    function clearFilter(key: keyof ReportFilters): void {
        const next = { ...filters, [key]: null };
        setForm(next);
        visit({}, next);
    }

    /** Export always mirrors what the server rendered, not unapplied form edits. */
    function exportReport(format: 'xlsx' | 'csv'): void {
        window.location.assign(`${reportUrl}/export?${new URLSearchParams(queryFrom(filters, { format })).toString()}`);
    }

    /**
     * Build the PDF in the browser so the chart travels with it.
     *
     * The rows come from the unpaged endpoint rather than the table on screen, so the document
     * carries the whole result set and not just the current page.
     */
    async function downloadPdf(): Promise<void> {
        setBuildingPdf(true);

        try {
            const response = await fetch(`${reportUrl}/data?${new URLSearchParams(queryFrom(filters)).toString()}`, {
                headers: { Accept: 'application/json' },
            });

            if (!response.ok) {
                throw new Error(`Request failed with ${response.status}`);
            }

            const payload: ReportPdfPayload = await response.json();
            setPdfPayload(payload);

            // Let React paint the off-screen document, and Recharts lay its bars out, before capture.
            await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 250)));

            if (pdfRef.current === null) {
                throw new Error('The document could not be prepared.');
            }

            const { default: html2pdf } = await import('html2pdf.js');

            await html2pdf()
                .set({
                    filename: `${report.slug}-${new Date().toISOString().slice(0, 10)}.pdf`,
                    margin: [8, 8, 10, 8],
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: pdfDocumentWidth },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
                })
                .from(pdfRef.current)
                .save();
        } catch (error) {
            toast.error(error instanceof Error ? `Could not build the PDF: ${error.message}` : 'Could not build the PDF.');
        } finally {
            setBuildingPdf(false);
            setPdfPayload(null);
        }
    }

    const activeChips = [
        filters.department_id && {
            key: 'department_id' as const,
            label: `Department: ${filterOptions.departments.find((item) => item.id === filters.department_id)?.name ?? filters.department_id}`,
        },
        filters.category_id && {
            key: 'category_id' as const,
            label: `Category: ${filterOptions.categories.find((item) => item.id === filters.category_id)?.name ?? filters.category_id}`,
        },
        filters.status && { key: 'status' as const, label: `Status: ${filters.status}` },
        filters.from && { key: 'from' as const, label: `From: ${filters.from}` },
        filters.to && { key: 'to' as const, label: `To: ${filters.to}` },
    ].filter(Boolean) as { key: keyof ReportFilters; label: string }[];

    const sortParams = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={title} />
            <div className="report-print-surface flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div className="min-w-0">
                        <p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">{report.category_label}</p>
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
                        <p className="mt-1 max-w-2xl text-sm font-medium">{report.answers}</p>
                        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">{description}</p>
                        <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-sm font-medium">
                            <CalendarRange className="size-4" />
                            {period}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 print:hidden">
                        <ReportSwitcher reports={switcher} currentKey={report.key} />
                        <Button variant="outline" onClick={() => router.get('/admin/reports')}>
                            <LayoutGrid /> All reports
                        </Button>
                        <Button variant="outline" onClick={downloadPdf} disabled={buildingPdf}>
                            {buildingPdf ? <LoaderCircle className="animate-spin" /> : <FileDown />}
                            {buildingPdf ? 'Building PDF…' : 'Download PDF'}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button>
                                    <Download /> Export
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem className="cursor-pointer" onClick={() => exportReport('xlsx')}>
                                    Excel (.xlsx)
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer" onClick={() => exportReport('csv')}>
                                    CSV (.csv)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {availableFilters.length > 0 && (
                    <Card className="print:hidden">
                        <CardContent className="p-4">
                            <form onSubmit={applyFilters} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                {supports('dates') && (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="date-from">From</Label>
                                            <Input
                                                id="date-from"
                                                type="date"
                                                value={form.from ?? ''}
                                                onChange={(event) => setForm({ ...form, from: event.target.value || null })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="date-to">To</Label>
                                            <Input
                                                id="date-to"
                                                type="date"
                                                value={form.to ?? ''}
                                                onChange={(event) => setForm({ ...form, to: event.target.value || null })}
                                            />
                                        </div>
                                    </>
                                )}

                                {supports('department') && (
                                    <div className="space-y-2">
                                        <Label>Department</Label>
                                        <Select
                                            value={form.department_id ? String(form.department_id) : none}
                                            onValueChange={(value) => setForm({ ...form, department_id: value === none ? null : Number(value) })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="All departments" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={none}>All departments</SelectItem>
                                                {filterOptions.departments.map((option) => (
                                                    <SelectItem key={option.id} value={String(option.id)}>
                                                        {option.name}
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
                                            value={form.category_id ? String(form.category_id) : none}
                                            onValueChange={(value) => setForm({ ...form, category_id: value === none ? null : Number(value) })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="All categories" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={none}>All categories</SelectItem>
                                                {filterOptions.categories.map((option) => (
                                                    <SelectItem key={option.id} value={String(option.id)}>
                                                        {option.name}
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
                                            value={form.status ?? none}
                                            onValueChange={(value) => setForm({ ...form, status: value === none ? null : value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="All statuses" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={none}>All statuses</SelectItem>
                                                {filterOptions.statuses.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label>Rows per page</Label>
                                    <Select
                                        value={String(perPage)}
                                        onValueChange={(value) => {
                                            setPerPage(Number(value));
                                            visit({ per_page: Number(value), page: 1 });
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[25, 50, 100].map((size) => (
                                                <SelectItem key={size} value={String(size)}>
                                                    {size} rows
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-4">
                                    <Button type="submit" disabled={busy}>
                                        {busy && <LoaderCircle className="animate-spin" />}
                                        Apply filters
                                    </Button>
                                    <Button type="button" variant="outline" onClick={resetFilters} disabled={busy}>
                                        <RotateCcw /> Reset
                                    </Button>
                                </div>
                            </form>

                            {activeChips.length > 0 && (
                                <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
                                    <span className="text-muted-foreground text-xs font-medium">Active filters</span>
                                    {activeChips.map((chip) => (
                                        <Badge key={chip.key} variant="secondary" className="gap-1 font-normal">
                                            <span className="max-w-56 truncate">{chip.label}</span>
                                            <button
                                                type="button"
                                                className="cursor-pointer"
                                                onClick={() => clearFilter(chip.key)}
                                                aria-label={`Clear ${chip.label}`}
                                            >
                                                <X className="size-3 opacity-60 hover:opacity-100" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                <ReportKpiCards kpis={kpis} />
                {chart && <ReportChartCard chart={chart} />}

                <div className="min-w-0 space-y-3">
                    <h2 className="text-lg font-semibold">Detailed records</h2>
                    <ReportDataTable
                        columns={columns}
                        rows={rows}
                        sort={{
                            key: sortParams.get('sort') ?? report.default_sort.key,
                            direction: (sortParams.get('direction') ?? report.default_sort.direction) === 'asc' ? 'asc' : 'desc',
                        }}
                        onPageChange={(page) => visit({ page })}
                        onSortChange={changeSort}
                        onReset={resetFilters}
                    />
                </div>
            </div>

            {/*
                Parked off-screen rather than hidden: `display: none` collapses the element, and
                Recharts needs real dimensions to lay the chart out before html2canvas reads it.
            */}
            {pdfPayload && (
                <div aria-hidden style={{ position: 'fixed', left: -20000, top: 0, width: pdfDocumentWidth, pointerEvents: 'none' }}>
                    <div ref={pdfRef}>
                        <ReportPdfDocument
                            organisation={organisation}
                            title={title}
                            description={description}
                            categoryLabel={report.category_label}
                            answers={report.answers}
                            columns={columns}
                            chart={chart}
                            payload={pdfPayload}
                            activeFilters={activeChips.map((chip) => chip.label)}
                        />
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
