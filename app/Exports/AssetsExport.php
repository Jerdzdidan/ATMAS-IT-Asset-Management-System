<?php

namespace App\Exports;

use App\Models\Asset;
use App\Models\User;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * The full hardware register as a spreadsheet.
 *
 * The column order matches the import template exactly, so an exported file can be edited and
 * fed straight back in without being rearranged.
 */
class AssetsExport implements FromCollection, ShouldAutoSize, WithHeadings, WithMapping, WithStyles, WithTitle
{
    use Exportable;

    public function __construct(private readonly User $viewer) {}

    /** @return Collection<int, Asset> */
    public function collection(): Collection
    {
        return Asset::query()
            ->with(['category:id,name', 'department:id,name,code', 'currentAssignment.user:id,name,employee_code'])
            ->visibleTo($this->viewer)
            ->orderByNewestTag()
            ->get();
    }

    /** @return list<string> */
    public function headings(): array
    {
        return [
            'Asset Tag',
            'Name',
            'Category',
            'Department Code',
            'Department',
            'Brand',
            'Model',
            'Serial Number',
            'Location',
            'Status',
            'Condition',
            'Purchase Date',
            'Warranty Expiry',
            'Purchase Cost',
            'Assigned To',
            'Remarks',
        ];
    }

    /**
     * @param  Asset  $row
     * @return list<string|float|null>
     */
    public function map($row): array
    {
        return [
            $row->asset_tag,
            $row->name,
            $row->category?->name,
            $row->department?->code,
            $row->department?->name,
            $row->brand,
            $row->model,
            $row->serial_number,
            $row->location,
            $row->status->value,
            $row->condition->value,
            $row->purchase_date?->toDateString(),
            $row->warranty_expires_at?->toDateString(),
            $row->purchase_cost === null ? null : (float) $row->purchase_cost,
            $row->currentAssignment?->user?->name,
            $row->remarks,
        ];
    }

    public function title(): string
    {
        return 'Asset Register';
    }

    /** @return array<int, array<string, mixed>> */
    public function styles(Worksheet $sheet): array
    {
        return [1 => ['font' => ['bold' => true]]];
    }
}
