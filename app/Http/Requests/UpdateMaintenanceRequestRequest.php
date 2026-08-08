<?php

namespace App\Http\Requests;

use App\Enums\MaintenanceRequestStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMaintenanceRequestRequest extends FormRequest
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
            'status' => [
                'required',
                Rule::enum(MaintenanceRequestStatus::class)->except(MaintenanceRequestStatus::Pending),
            ],
            // A closed ticket must explain what was done or why it was turned down.
            'resolution_notes' => [
                Rule::requiredIf(fn (): bool => in_array(
                    $this->input('status'),
                    [MaintenanceRequestStatus::Resolved->value, MaintenanceRequestStatus::Rejected->value],
                    true,
                )),
                'nullable',
                'string',
                'max:2000',
            ],
        ];
    }
}
