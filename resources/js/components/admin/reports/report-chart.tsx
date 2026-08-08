import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface ReportChart {
    label: string;
    /** `timeseries` plots one bar per month; `ranking` plots the strongest few categories. */
    kind: 'timeseries' | 'ranking';
    format: 'number' | 'currency';
    data: { label: string; value: number }[];
}

/** Turn a `2026-03` bucket into `Mar 2026`. */
function formatMonth(value: string): string {
    const parsed = new Date(`${value}-01T00:00:00`);

    return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat('en-PH', { month: 'short', year: '2-digit' }).format(parsed);
}

function formatValue(value: number, format: ReportChart['format']): string {
    return format === 'currency'
        ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value)
        : value.toLocaleString('en-PH');
}

/** Long department names would otherwise collide along the axis. */
function truncate(value: string): string {
    return value.length > 14 ? `${value.slice(0, 13)}…` : value;
}

function ChartTooltip({ active, payload, label, chart }: { active?: boolean; payload?: { value?: number }[]; label?: string; chart: ReportChart }) {
    if (!active || !payload?.length) {
        return null;
    }

    return (
        <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-md">
            <p className="font-medium">{chart.kind === 'timeseries' && label ? formatMonth(label) : label}</p>
            <p className="text-muted-foreground mt-0.5 tabular-nums">{formatValue(payload[0]?.value ?? 0, chart.format)}</p>
        </div>
    );
}

export function ReportChartCard({ chart }: { chart: ReportChart }) {
    const isTimeseries = chart.kind === 'timeseries';

    return (
        <Card className="min-w-0 overflow-hidden">
            <CardHeader className="pb-2">
                <CardTitle className="text-base">{chart.label}</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
                {chart.data.length === 0 ? (
                    <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 text-sm">
                        <BarChart3 className="size-5 opacity-50" />
                        Nothing to plot for this selection.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chart.data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis
                                dataKey="label"
                                tickLine={false}
                                axisLine={false}
                                minTickGap={8}
                                tickMargin={8}
                                tick={{ fontSize: 11 }}
                                tickFormatter={(value: string) => (isTimeseries ? formatMonth(value) : truncate(value))}
                            />
                            <YAxis
                                allowDecimals={false}
                                tickLine={false}
                                axisLine={false}
                                width={chart.format === 'currency' ? 64 : 40}
                                tick={{ fontSize: 11 }}
                                tickFormatter={(value: number) =>
                                    chart.format === 'currency'
                                        ? new Intl.NumberFormat('en-PH', { notation: 'compact' }).format(value)
                                        : String(value)
                                }
                            />
                            <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.4 }} content={<ChartTooltip chart={chart} />} />
                            <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={56} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
