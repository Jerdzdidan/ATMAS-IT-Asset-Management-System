import { type ReportChart } from '@/components/admin/reports/report-chart';
import { type ReportColumn } from '@/components/admin/reports/report-data-table';
import { type ReportKpi } from '@/components/admin/reports/report-kpi-cards';
import { type CSSProperties } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';

export interface ReportPdfPayload {
    rows: Record<string, string | number | null>[];
    kpis: ReportKpi[];
    period: string;
    generatedBy: string;
    generatedAt: string;
}

interface ReportPdfDocumentProps {
    organisation: string;
    title: string;
    description: string;
    categoryLabel: string;
    answers: string;
    columns: ReportColumn[];
    chart: ReportChart | null;
    payload: ReportPdfPayload;
    activeFilters: string[];
    width: number;
    /**
     * Row index where each page after the first begins.
     *
     * Empty on the measuring pass, which renders the table whole so the real row heights can be
     * read off the DOM; the capture pass then gets the boundaries back.
     */
    pageBreaks: number[];
    /** Set when the final page of rows had no room left for the sign-off block. */
    signoffOnOwnPage: boolean;
}

/**
 * Fixed light palette.
 *
 * The document is rasterized from the live DOM, so it must not inherit the app's theme tokens —
 * a dark-mode session would otherwise produce a black PDF.
 */
const ink = '#22242e';
const brand = '#384d9c';
const muted = '#6a6d7d';
const hairline = '#e6e8ef';

/** The narrowest the document is laid out at before it is scaled onto A4 landscape. */
const baseDocumentWidth = 1120;

/** A4 landscape in mm, less the margins passed to html2pdf. */
export const pdfPageMargins = { top: 8, right: 8, bottom: 10, left: 8 };

/**
 * Printable height as a fraction of printable width.
 *
 * html2pdf scales the captured image to the page width, so this ratio converts the document's
 * pixel width into the pixel height that one page holds.
 */
export const pdfPageRatio = (210 - pdfPageMargins.top - pdfPageMargins.bottom) / (297 - pdfPageMargins.left - pdfPageMargins.right);

/** The html2canvas scale factor; the slice height depends on it, so both must agree. */
export const pdfCaptureScale = 2;

/** Inner margin of each page box, subtracted when working out how many rows fit. */
export const pdfPagePadding = 32;

/**
 * Height of one page, in document pixels, matching exactly where html2pdf slices the canvas.
 *
 * Mirrors its `Math.floor(canvas.width * ratio)`. Laying each page out at precisely this height
 * lands every slice on a page boundary, which is why the document does not use html2pdf's own
 * page-break markers: those are positioned on a grid derived from the physical page size, and
 * only line up when the document happens to be exactly one page wide in CSS pixels.
 */
export function pdfPageHeightFor(width: number): number {
    return Math.floor(width * pdfCaptureScale * pdfPageRatio) / pdfCaptureScale;
}

/**
 * How wide to lay the document out for a given number of columns.
 *
 * A wide report is drawn on a wider canvas and scaled down to the page, rather than squeezed
 * into a fixed one — squeezing is what pushed the last columns off the right-hand edge.
 */
export function pdfWidthFor(columnCount: number): number {
    return Math.max(baseDocumentWidth, columnCount * 118);
}

/**
 * Relative column widths, so `table-layout: fixed` does not hand a date the same room as an
 * address. Fixed layout is what guarantees the table can never grow past the page.
 */
function columnWeight(type: ReportColumn['type']): number {
    switch (type) {
        case 'numeric':
        case 'currency':
        case 'percent':
        case 'status':
        case 'condition':
        case 'badge':
        case 'date':
            return 1;
        case 'datetime':
            return 1.3;
        case 'notes':
            return 2.2;
        default:
            return 1.5;
    }
}

const toneColors: Record<string, string> = {
    critical: '#e11d48',
    warning: '#d97706',
    normal: brand,
};

function isNumericColumn(type: ReportColumn['type']): boolean {
    return type === 'numeric' || type === 'currency' || type === 'percent';
}

function formatCell(value: string | number | null, type: ReportColumn['type']): string {
    if (value === null || value === '') {
        return '';
    }

    const text = String(value);

    switch (type) {
        case 'currency':
            return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value));
        case 'percent':
            return `${Number(value).toLocaleString('en-PH')}%`;
        case 'numeric':
            return Number(value).toLocaleString('en-PH');
        case 'date':
            return new Intl.DateTimeFormat('en-PH', { day: 'numeric', month: 'short', year: 'numeric' }).format(
                new Date(`${text.slice(0, 10)}T00:00:00`),
            );
        case 'datetime':
            return new Intl.DateTimeFormat('en-PH', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
            }).format(new Date(text.includes('T') ? text : text.replace(' ', 'T')));
        case 'status':
        case 'condition':
        case 'badge':
            return text
                .toLowerCase()
                .split('_')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        default:
            return text;
    }
}

function formatMonth(value: string): string {
    const parsed = new Date(`${value}-01T00:00:00`);

    return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat('en-PH', { month: 'short', year: '2-digit' }).format(parsed);
}

/**
 * The report rendered as a paper document.
 *
 * Every colour and size is written inline rather than through Tailwind tokens: html2canvas
 * resolves computed styles, and the utility classes carry theme-dependent CSS variables.
 */
export function ReportPdfDocument({
    organisation,
    title,
    description,
    categoryLabel,
    answers,
    columns,
    chart,
    payload,
    activeFilters,
    width,
    pageBreaks,
    signoffOnOwnPage,
}: ReportPdfDocumentProps) {
    const weights = columns.map((column) => columnWeight(column.type));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    // Turn the break points into [start, end) slices covering every row exactly once.
    const boundaries = [0, ...pageBreaks.filter((index) => index > 0 && index < payload.rows.length), payload.rows.length];
    const pages = boundaries.slice(0, -1).map((start, index) => ({ start, end: boundaries[index + 1] }));
    const generatedAt = new Intl.DateTimeFormat('en-PH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(payload.generatedAt));

    const pageHeight = pdfPageHeightFor(width);

    /* Each page is laid out at exactly the slice height, so the capture cuts on the boundaries. */
    const pageStyle: CSSProperties = {
        width,
        height: pageHeight,
        boxSizing: 'border-box',
        padding: pdfPagePadding,
        overflow: 'hidden',
    };

    const masthead = (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, borderBottom: `3px solid ${brand}`, paddingBottom: 14 }}>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: brand }}>
                        {organisation} <span style={{ color: muted, fontWeight: 400, fontSize: 15 }}>| IT Asset Management</span>
                    </div>
                    <div style={{ fontSize: 10, color: muted, textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 8 }}>{categoryLabel}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{title}</div>
                    <div style={{ fontSize: 12, marginTop: 4, fontWeight: 600 }}>{answers}</div>
                    <div style={{ fontSize: 12, color: muted, marginTop: 2, maxWidth: 720 }}>{description}</div>
                </div>
                <div style={{ fontSize: 11, color: muted, textAlign: 'right', lineHeight: 1.7, whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 700, color: ink }}>{payload.period}</div>
                    <div>Generated {generatedAt}</div>
                    <div>By {payload.generatedBy}</div>
                    <div>{payload.rows.length.toLocaleString('en-PH')} record(s)</div>
                </div>
            </div>

            {activeFilters.length > 0 && (
                <div style={{ fontSize: 11, color: muted, marginTop: 12 }}>
                    <span style={{ fontWeight: 700, color: ink }}>Filters applied: </span>
                    {activeFilters.join(' · ')}
                </div>
            )}

            {payload.kpis.length > 0 && (
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    {payload.kpis.map((kpi) => (
                        <div
                            key={kpi.label}
                            style={{ flex: 1, background: '#f4f6fb', border: `1px solid #dde3f0`, borderRadius: 5, padding: '10px 12px' }}
                        >
                            <div style={{ fontSize: 9.5, color: muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>{kpi.label}</div>
                            <div style={{ fontSize: 19, fontWeight: 700, color: brand, marginTop: 3 }}>{kpi.value}</div>
                            {kpi.hint && <div style={{ fontSize: 9.5, color: muted, marginTop: 2 }}>{kpi.hint}</div>}
                        </div>
                    ))}
                </div>
            )}

            {chart && chart.data.length > 0 && (
                <div style={{ marginTop: 20, border: `1px solid ${hairline}`, borderRadius: 6, padding: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{chart.label}</div>
                    {/* Fixed dimensions: ResponsiveContainer measures nothing while off-screen. */}
                    <BarChart width={width - 92} height={240} data={chart.data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={hairline} />
                        <XAxis
                            dataKey="label"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11, fill: muted }}
                            tickMargin={8}
                            tickFormatter={(value: string) => (chart.kind === 'timeseries' ? formatMonth(value) : value)}
                        />
                        <YAxis
                            allowDecimals={false}
                            tickLine={false}
                            axisLine={false}
                            width={chart.format === 'currency' ? 72 : 48}
                            tick={{ fontSize: 11, fill: muted }}
                            tickFormatter={(value: number) =>
                                chart.format === 'currency' ? new Intl.NumberFormat('en-PH', { notation: 'compact' }).format(value) : String(value)
                            }
                        />
                        <Bar dataKey="value" fill={brand} radius={[3, 3, 0, 0]} maxBarSize={56} isAnimationActive={false}>
                            {chart.data.map((point) => (
                                <Cell key={point.label} fill={point.tone ? (toneColors[point.tone] ?? brand) : brand} />
                            ))}
                        </Bar>
                    </BarChart>
                </div>
            )}

            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 22, marginBottom: 8 }}>Detailed records</div>
        </>
    );

    const emptyState = (
        <div style={{ padding: 32, textAlign: 'center', color: muted, border: `1px dashed #d5d8e2`, borderRadius: 6, fontSize: 12 }}>
            No records match the selected filters.
        </div>
    );

    /* A page's worth of rows, carrying its own header so every page is readable on its own. */
    const tableFor = (page: { start: number; end: number }, pageIndex: number) => (
        <table data-pdf-table={pageIndex} style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5, tableLayout: 'fixed' }}>
            {/* Explicit shares: with a fixed layout the browser would otherwise split the width evenly. */}
            <colgroup>
                {columns.map((column, index) => (
                    <col key={column.key} style={{ width: `${(weights[index] / totalWeight) * 100}%` }} />
                ))}
            </colgroup>
            <thead data-pdf-head>
                <tr>
                    {columns.map((column) => (
                        <th
                            key={column.key}
                            style={{
                                background: brand,
                                color: '#ffffff',
                                textAlign: isNumericColumn(column.type) ? 'right' : 'left',
                                padding: '7px 8px',
                                fontSize: 10,
                                textTransform: 'uppercase',
                                letterSpacing: 0.4,
                                overflowWrap: 'anywhere',
                            }}
                        >
                            {column.label}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {payload.rows.slice(page.start, page.end).map((row, offset) => {
                    const index = page.start + offset;

                    return (
                        /*
                         * No `page-break-inside` here on purpose. The rows are already
                         * split into pages above, and html2pdf answers that rule by
                         * inserting a spacer <div> inside <tbody> — which the browser
                         * hoists out of the table, shunting the page down.
                         */
                        <tr key={index} data-pdf-row style={{ background: index % 2 === 1 ? '#fafbfe' : '#ffffff' }}>
                            {columns.map((column) => (
                                <td
                                    key={column.key}
                                    style={{
                                        padding: '6px 8px',
                                        borderBottom: `1px solid ${hairline}`,
                                        textAlign: isNumericColumn(column.type) ? 'right' : 'left',
                                        // Serials and tags have no spaces to break on; without this they widen the column.
                                        overflowWrap: 'anywhere',
                                    }}
                                >
                                    {/* The audit count sheet leaves this blank for a tick in the field. */}
                                    {column.key === 'verified' ? (
                                        <span style={{ display: 'inline-block', width: 34, borderBottom: `1px solid #9a9aa4` }}>&nbsp;</span>
                                    ) : (
                                        formatCell(row[column.key] ?? null, column.type)
                                    )}
                                </td>
                            ))}
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );

    const signoff = (
        <div data-pdf-signoff>
            <div style={{ display: 'flex', gap: 40, marginTop: 40 }}>
                {[`Prepared by — ${payload.generatedBy}`, 'Reviewed by', 'Approved by'].map((role) => (
                    <div key={role} style={{ flex: 1, borderTop: `1px solid #9a9aa4`, paddingTop: 5, fontSize: 10.5, color: muted }}>
                        {role}
                    </div>
                ))}
            </div>

            <div style={{ marginTop: 22, fontSize: 9.5, color: '#9a9aa4' }}>
                {organisation} — system-generated report. Figures reflect the register at the time of generation.
            </div>
        </div>
    );

    if (payload.rows.length === 0) {
        return (
            <div style={{ width, background: '#ffffff', color: ink, fontFamily: 'Arial, Helvetica, sans-serif' }}>
                <div style={pageStyle}>
                    {masthead}
                    {emptyState}
                    {signoff}
                </div>
            </div>
        );
    }

    return (
        <div style={{ width, background: '#ffffff', color: ink, fontFamily: 'Arial, Helvetica, sans-serif' }}>
            {pages.map((page, pageIndex) => (
                <div key={page.start} style={pageStyle}>
                    {pageIndex === 0 && masthead}
                    {tableFor(page, pageIndex)}
                    {pageIndex === pages.length - 1 && !signoffOnOwnPage && signoff}
                </div>
            ))}

            {/* Only when the last page of rows had no room left for it. */}
            {signoffOnOwnPage && <div style={pageStyle}>{signoff}</div>}
        </div>
    );
}
