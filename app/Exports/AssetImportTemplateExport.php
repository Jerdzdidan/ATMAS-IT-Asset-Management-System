<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * A blank workbook with the import headings and one worked example row.
 *
 * Handing out the template is what stops most import failures: the column names are the part
 * people get wrong, and an example row settles the date and code formats at a glance.
 */
class AssetImportTemplateExport implements FromCollection, ShouldAutoSize, WithHeadings, WithStyles, WithTitle
{
    use Exportable;

    /**
     * The headings the importer reads, in order.
     *
     * @var list<string>
     */
    public const COLUMNS = [
        'Name',
        'Category',
        'Brand',
        'Model',
        'Serial Number',
        'Location',
        'Condition',
        'Purchase Date',
        'Warranty Expiry',
        'Purchase Cost',
        'Remarks',
    ];

    /**
     * The department is left out on purpose: an asset joins one when it is issued to an employee,
     * so there is nothing sensible for a spreadsheet to say about it.
     *
     * @param  list<string>  $categoryNames
     */
    public function __construct(private readonly array $categoryNames = []) {}

    /** @return Collection<int, list<string|null>> */
    public function collection(): Collection
    {
        return collect([
            [
                'Dell Latitude 5440',
                $this->categoryNames[0] ?? 'Laptop',
                'Dell',
                'Latitude 5440',
                'SN-EXAMPLE-001',
                'Head Office - 2nd Floor',
                'NEW',
                '2026-01-15',
                '2029-01-15',
                '58000.00',
                'Delete this example row before importing.',
            ],
        ]);
    }

    /** @return list<string> */
    public function headings(): array
    {
        return self::COLUMNS;
    }

    public function title(): string
    {
        return 'Import Template';
    }

    /** @return array<int, array<string, mixed>> */
    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true]],
            2 => ['font' => ['italic' => true, 'color' => ['argb' => 'FF888888']]],
        ];
    }
}
