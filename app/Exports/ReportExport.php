<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Turns any report produced by the report builder into a workbook.
 *
 * The builder already fixed the column order and formatted every cell as text, so this class
 * only has to lay the rows out — which is why one exporter covers all ten reports.
 */
class ReportExport implements FromCollection, ShouldAutoSize, WithHeadings, WithStyles, WithTitle
{
    use Exportable;

    /**
     * @param  array{title: string, description: string, columns: list<array{key: string, label: string}>, rows: list<array<string, mixed>>, summary: list<array{label: string, value: string}>}  $report
     */
    public function __construct(private readonly array $report) {}

    /** @return Collection<int, list<mixed>> */
    public function collection(): Collection
    {
        $keys = array_column($this->report['columns'], 'key');

        $rows = collect($this->report['rows'])->map(
            fn (array $row): array => array_map(fn (string $key): mixed => $row[$key] ?? '', $keys),
        );

        // The headline figures ride along under the table so the sheet stands on its own.
        $rows->push(array_fill(0, count($keys), ''));

        foreach ($this->report['summary'] as $figure) {
            $rows->push(array_pad([$figure['label'], $figure['value']], count($keys), ''));
        }

        return $rows;
    }

    /** @return list<string> */
    public function headings(): array
    {
        return array_column($this->report['columns'], 'label');
    }

    public function title(): string
    {
        return Str::limit($this->report['title'], 28, '');
    }

    /** @return array<int, array<string, mixed>> */
    public function styles(Worksheet $sheet): array
    {
        return [1 => ['font' => ['bold' => true]]];
    }
}
