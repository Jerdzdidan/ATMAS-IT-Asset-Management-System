<?php

namespace App\Http\Requests;

use App\Enums\AssetCondition;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReturnAssetAssignmentRequest extends FormRequest
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
            'returned_at' => ['required', 'date', 'before_or_equal:now'],
            'condition' => ['required', Rule::enum(AssetCondition::class)],
            'return_notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
