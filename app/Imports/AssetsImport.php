<?php

namespace App\Imports;

use App\Enums\AssetCondition;
use App\Models\Asset;
use App\Models\AssetCategory;
use Carbon\Exceptions\InvalidFormatException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

/**
 * Loads a spreadsheet of assets into the register.
 *
 * Rows are validated one at a time and a bad row is reported rather than aborting the run, so
 * a 300-line workbook with four typos still lands the other 296 records. Asset tags are left
 * to the model's generator unless the sheet carries one from a legacy system.
 */
class AssetsImport implements ToCollection, WithHeadingRow
{
    /**
     * Row-level problems, keyed by the spreadsheet line number the operator sees.
     *
     * @var list<array{row: int, message: string}>
     */
    private array $errors = [];

    private int $imported = 0;

    /** @var Collection<string, int> */
    private Collection $categories;

    public function __construct()
    {
        // Keyed on the upper-cased name so a sheet typed in any casing still resolves.
        $this->categories = AssetCategory::query()->pluck('id', 'name')->mapWithKeys(
            fn (int $id, string $name): array => [Str::upper($name) => $id],
        );
    }

    /**
     * @param  Collection<int, Collection<string, mixed>>  $rows
     */
    public function collection(Collection $rows): void
    {
        foreach ($rows as $index => $row) {
            // +2 puts the number back in spreadsheet terms: one for the heading, one for 1-indexing.
            $this->importRow($row, $index + 2);
        }
    }

    /**
     * @param  Collection<string, mixed>  $row
     */
    private function importRow(Collection $row, int $lineNumber): void
    {
        if ($row->filter(fn ($value): bool => filled($value))->isEmpty()) {
            return;
        }

        $categoryName = Str::upper(trim((string) $row->get('category')));

        if (! $this->categories->has($categoryName)) {
            $this->errors[] = ['row' => $lineNumber, 'message' => "Unknown category \"{$categoryName}\"."];

            return;
        }

        // No department column: an imported asset joins a department when it is issued to someone.
        $attributes = [
            'name' => trim((string) $row->get('name')),
            'asset_category_id' => $this->categories->get($categoryName),
            'brand' => $this->text($row->get('brand')),
            'model' => $this->text($row->get('model')),
            'serial_number' => filled($row->get('serial_number')) ? Str::upper(trim((string) $row->get('serial_number'))) : null,
            'location' => $this->text($row->get('location')),
            'condition' => filled($row->get('condition'))
                ? Str::upper(trim((string) $row->get('condition')))
                : AssetCondition::Good->value,
            'purchase_date' => $this->date($row->get('purchase_date')),
            'warranty_expires_at' => $this->date($row->get('warranty_expiry')),
            'purchase_cost' => filled($row->get('purchase_cost')) ? (float) $row->get('purchase_cost') : null,
            'remarks' => $this->text($row->get('remarks')),
        ];

        $validator = Validator::make($attributes, [
            'name' => ['required', 'string', 'max:150'],
            'brand' => ['nullable', 'string', 'max:100'],
            'model' => ['nullable', 'string', 'max:100'],
            'serial_number' => ['nullable', 'string', 'max:100', 'unique:assets,serial_number'],
            'location' => ['nullable', 'string', 'max:150'],
            'condition' => ['required', 'in:NEW,GOOD,FAIR,POOR'],
            'purchase_date' => ['nullable', 'date'],
            'warranty_expires_at' => ['nullable', 'date'],
            'purchase_cost' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'remarks' => ['nullable', 'string', 'max:2000'],
        ]);

        if ($validator->fails()) {
            $this->errors[] = ['row' => $lineNumber, 'message' => implode(' ', $validator->errors()->all())];

            return;
        }

        Asset::create($attributes);
        $this->imported++;
    }

    /**
     * Read a cell that may arrive as an Excel serial number or as typed text.
     */
    private function date(mixed $value): ?string
    {
        if (blank($value)) {
            return null;
        }

        if (is_numeric($value)) {
            return Carbon::instance(ExcelDate::excelToDateTimeObject((float) $value))->toDateString();
        }

        try {
            return Carbon::parse((string) $value)->toDateString();
        } catch (InvalidFormatException) {
            // Returned as-is so the date validation rule reports it against the right row.
            return (string) $value;
        }
    }

    private function text(mixed $value): ?string
    {
        return blank($value) ? null : trim((string) $value);
    }

    /**
     * A summary of the run, for the flash message shown afterwards.
     *
     * @return array{imported: int, failed: int, errors: list<array{row: int, message: string}>}
     */
    public function summary(): array
    {
        return [
            'imported' => $this->imported,
            'failed' => count($this->errors),
            // Capped so one badly formatted workbook cannot overflow the session cookie.
            'errors' => array_slice($this->errors, 0, 20),
        ];
    }
}
