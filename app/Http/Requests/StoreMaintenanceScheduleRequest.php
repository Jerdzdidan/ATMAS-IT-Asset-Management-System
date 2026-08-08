<?php

namespace App\Http\Requests;

use App\Enums\MaintenanceFrequency;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMaintenanceScheduleRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->managesAssets() ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'asset_id' => ['required', 'integer', 'exists:assets,id'],
            'title' => ['required', 'string', 'max:150'],
            'frequency' => ['required', Rule::enum(MaintenanceFrequency::class)],
            // A plan may be backdated when it is entered from an existing paper schedule.
            'next_due_on' => ['required', 'date'],
            'instructions' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['boolean'],
        ];
    }
}
