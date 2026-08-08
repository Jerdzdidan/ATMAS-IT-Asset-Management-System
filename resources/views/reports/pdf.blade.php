{{--
    Printable version of any report in the catalogue.

    Styled inline because DomPDF resolves neither the Vite bundle nor external stylesheets, and
    cells are formatted here rather than upstream so the workbook can keep its raw numbers.
--}}
@php
    $render = function ($value, string $type): string {
        if ($value === null || $value === '') {
            return '';
        }

        return match ($type) {
            'currency' => '₱' . number_format((float) $value, 2),
            'percent' => rtrim(rtrim(number_format((float) $value, 1), '0'), '.') . '%',
            'numeric' => number_format((float) $value),
            'date' => \Illuminate\Support\Carbon::parse($value)->format('d M Y'),
            'datetime' => \Illuminate\Support\Carbon::parse($value)->format('d M Y, g:i A'),
            'status', 'condition', 'badge' => \Illuminate\Support\Str::headline(strtolower((string) $value)),
            default => (string) $value,
        };
    };
    $isNumeric = fn (string $type): bool => in_array($type, ['numeric', 'currency', 'percent'], true);
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ $report['title'] }}</title>
    <style>
        @page { margin: 18mm 12mm 16mm; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 8.5px; color: #22242e; margin: 0; }
        .masthead { border-bottom: 2.5px solid #384d9c; padding-bottom: 8px; margin-bottom: 14px; }
        .masthead td { vertical-align: bottom; }
        .brand { font-size: 15px; font-weight: bold; color: #384d9c; letter-spacing: 0.4px; }
        .brand span { color: #55555f; font-weight: normal; }
        .eyebrow { font-size: 7.5px; color: #6a6d7d; text-transform: uppercase; letter-spacing: 1px; }
        .report-title { font-size: 13px; font-weight: bold; margin: 2px 0 1px; }
        .report-note { color: #6a6d7d; font-size: 8.5px; }
        .meta { text-align: right; color: #6a6d7d; font-size: 8px; line-height: 1.5; }
        .summary { width: 100%; border-collapse: separate; border-spacing: 5px 0; margin-bottom: 12px; }
        .summary td { background: #f4f6fb; border: 1px solid #dde3f0; border-radius: 3px; padding: 6px 8px; }
        .summary .label { color: #6a6d7d; font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.5px; }
        .summary .value { font-size: 12px; font-weight: bold; color: #384d9c; padding-top: 2px; }
        table.data { width: 100%; border-collapse: collapse; }
        table.data th { background: #384d9c; color: #fff; text-align: left; padding: 5px 6px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.4px; }
        table.data td { padding: 4px 6px; border-bottom: 1px solid #e6e8ef; }
        table.data tr:nth-child(even) td { background: #fafbfe; }
        .right { text-align: right; }
        .tick { display: inline-block; width: 26px; border-bottom: 1px solid #9a9aa4; }
        .empty { padding: 24px; text-align: center; color: #85858f; border: 1px dashed #d5d8e2; }
        .signoff { margin-top: 26px; width: 100%; }
        .signoff td { width: 33%; padding-top: 26px; font-size: 8px; color: #6a6d7d; }
        .signoff .rule { border-top: 1px solid #9a9aa4; padding-top: 3px; }
        .footer { position: fixed; bottom: -10mm; left: 0; right: 0; color: #9a9aa4; font-size: 7.5px; }
    </style>
</head>
<body>
    <table class="masthead" width="100%">
        <tr>
            {{-- DomPDF resolves no HTTP assets, so the mark rides in as a data URI. --}}
            <td width="46" style="vertical-align: top;">
                @if ($logo)<img src="{{ $logo }}" alt="" width="38" height="38">@endif
            </td>
            <td>
                <div class="brand">{{ $organisation }} <span>| IT Asset Management</span></div>
                <div class="eyebrow">{{ $report['category_label'] }}</div>
                <div class="report-title">{{ $report['title'] }}</div>
                <div class="report-note">{{ $report['description'] }}</div>
            </td>
            <td class="meta">
                {{ $period }}<br>
                Generated {{ $generatedAt->format('d M Y, g:i A') }}<br>
                By {{ $generatedBy }}<br>
                {{ number_format(count($rows)) }} record(s)
            </td>
        </tr>
    </table>

    @if (! empty($kpis))
        <table class="summary">
            <tr>
                @foreach ($kpis as $kpi)
                    <td width="{{ (int) (100 / count($kpis)) }}%">
                        <div class="label">{{ $kpi['label'] }}</div>
                        <div class="value">{{ $kpi['value'] }}</div>
                    </td>
                @endforeach
            </tr>
        </table>
    @endif

    @if (empty($rows))
        <div class="empty">No records match the selected filters.</div>
    @else
        <table class="data">
            <thead>
                <tr>
                    @foreach ($columns as $column)
                        <th class="{{ $isNumeric($column['type']) ? 'right' : '' }}">{{ $column['label'] }}</th>
                    @endforeach
                </tr>
            </thead>
            <tbody>
                @foreach ($rows as $row)
                    <tr>
                        @foreach ($columns as $column)
                            <td class="{{ $isNumeric($column['type']) ? 'right' : '' }}">
                                @if ($column['key'] === 'verified')
                                    {{-- Left blank so the auditor can tick it off in the field. --}}
                                    <span class="tick">&nbsp;</span>
                                @else
                                    {{ $render($row[$column['key']] ?? null, $column['type']) }}
                                @endif
                            </td>
                        @endforeach
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <table class="signoff">
        <tr>
            <td><div class="rule">Prepared by &mdash; {{ $generatedBy }}</div></td>
            <td><div class="rule">Reviewed by</div></td>
            <td><div class="rule">Approved by</div></td>
        </tr>
    </table>

    <div class="footer">{{ $organisation }} &mdash; system-generated report. Figures reflect the register at the time of generation.</div>
</body>
</html>
