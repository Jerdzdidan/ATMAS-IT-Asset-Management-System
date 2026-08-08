<?php

namespace App\Http\Requests;

use App\Enums\AssetCondition;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAssetRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->managesAssets() ?? false;
    }

    /**
     * Serial numbers are stored uppercase so lookups stay predictable.
     *
     * The asset tag is deliberately absent: it is printed on the device and never reassigned.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'serial_number' => $this->filled('serial_number')
                ? strtoupper(trim((string) $this->input('serial_number')))
                : null,
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $assetId = $this->route('asset')?->id;

        return [
            'name' => ['required', 'string', 'max:150'],
            'asset_category_id' => ['required', 'integer', 'exists:asset_categories,id'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'brand' => ['nullable', 'string', 'max:100'],
            'model' => ['nullable', 'string', 'max:100'],
            'serial_number' => ['nullable', 'string', 'max:100', Rule::unique('assets', 'serial_number')->ignore($assetId)],
            'location' => ['nullable', 'string', 'max:150'],
            'condition' => ['required', Rule::enum(AssetCondition::class)],
            'purchase_date' => ['nullable', 'date', 'before_or_equal:today'],
            'warranty_expires_at' => ['nullable', 'date', 'after_or_equal:purchase_date'],
            'purchase_cost' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'remarks' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
