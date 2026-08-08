<?php

namespace App\Http\Requests\Employee;

use App\Enums\MaintenanceRequestStatus;
use App\Enums\MaintenanceRequestType;
use App\Models\MaintenanceRequest;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMaintenanceRequestRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // Employees may only report issues for hardware currently in their custody.
            'asset_id' => [
                'required',
                'integer',
                Rule::exists('asset_assignments', 'asset_id')->where(
                    fn ($query) => $query->where('user_id', $this->user()->id)->whereNull('returned_at'),
                ),
            ],
            'request_type' => ['required', Rule::enum(MaintenanceRequestType::class)],
            'issue_description' => ['required', 'string', 'max:2000'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'asset_id.exists' => 'You may only submit requests for equipment currently assigned to you.',
        ];
    }

    /**
     * Block a second open ticket for hardware that already has one under review.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->has('asset_id')) {
                    return;
                }

                $hasOpenRequest = MaintenanceRequest::query()
                    ->where('asset_id', $this->integer('asset_id'))
                    ->whereIn('status', [MaintenanceRequestStatus::Pending, MaintenanceRequestStatus::InProgress])
                    ->exists();

                if ($hasOpenRequest) {
                    $validator->errors()->add('asset_id', 'This equipment already has an open maintenance request.');
                }
            },
        ];
    }
}
