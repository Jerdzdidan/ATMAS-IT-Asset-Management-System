<?php

namespace App\Exports;

use App\Services\Reports\ReportCatalog;
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
 * Turns any report from the catalogue into a workbook.
 *
 * Numbers are written as numbers rather than pre-formatted text, so the recipient can total a
 * cost column in Excel without stripping peso signs first.
 */
class ReportExport implements FromCollection, ShouldAutoSize, WithHeadings, WithStyles, WithTitle
{
    use Exportable;

    /**
     * @param  list<array{key: string, label: string, type: string}>  $columns
     * @param  list<array<string, mixed>>  $rows
     * @param  list<array{label: string, value: string|int|float}>  $kpis
     */
    public function __construct(
        private readonly string $title,
        private readonly array $columns,
        private readonly array $rows,
        private readonly array $kpis = [],
    ) {}

    /** @return Collection<int, list<mixed>> */
    public function collection(): Collection
    {
        $width = count($this->columns);

        $rows = collect($this->rows)->map(fn (array $row): array => array_map(
            fn (array $column): mixed => $this->cell($row[$column['key']] ?? null, $column['type']),
            $this->columns,
        ));

        if ($this->kpis === []) {
            return $rows;
        }

        // The headline figures ride along under the table so the sheet stands on its own.
        $rows->push(array_fill(0, $width, ''));
        $rows->push(array_pad(['Summary'], $width, ''));

        foreach ($this->kpis as $kpi) {
            $rows->push(array_pad([$kpi['label'], $kpi['value']], $width, ''));
        }

        return $rows;
    }

    /**
     * Hand Excel a native type wherever the column is genuinely numeric.
     */
    private function cell(mixed $value, string $type): mixed
    {
        if ($value === null || $value === '') {
            return '';
        }

        return match ($type) {
            ReportCatalog::TYPE_CURRENCY, ReportCatalog::TYPE_PERCENT => (float) $value,
            ReportCatalog::TYPE_NUMERIC => (int) $value,
            default => $value,
        };
    }

    /** @return list<string> */
    public function headings(): array
    {
        return array_column($this->columns, 'label');
    }

    public function title(): string
    {
        // Worksheet names are capped at 31 characters and reject several punctuation marks.
        return Str::limit(preg_replace('/[\\\\\/?*\[\]:]/', '', $this->title) ?? 'Report', 28, '');
    }

    /** @return array<int, array<string, mixed>> */
    public function styles(Worksheet $sheet): array
    {
        return [1 => ['font' => ['bold' => true]]];
    }
}
