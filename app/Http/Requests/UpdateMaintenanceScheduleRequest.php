<?php

namespace App\Http\Requests;

use App\Enums\MaintenanceFrequency;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMaintenanceScheduleRequest extends FormRequest
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
     * The asset is deliberately absent: moving a plan between assets would orphan its service
     * history, so a plan on the wrong asset is deleted and re-entered.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:150'],
            'frequency' => ['required', Rule::enum(MaintenanceFrequency::class)],
            'next_due_on' => ['required', 'date'],
            'instructions' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['boolean'],
        ];
    }
}
