<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->managesUsers() ?? false;
    }

    /**
     * Newly created accounts are always active; the status is only editable on update.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'status' => 'ACTIVE',
            'employee_code' => $this->filled('employee_code')
                ? strtoupper(trim((string) $this->input('employee_code')))
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
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', Password::defaults()],
            'role' => ['required', Rule::enum(UserRole::class)],
            'employee_code' => ['nullable', 'string', 'max:30', 'unique:users,employee_code'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'position' => ['nullable', 'string', 'max:100'],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'status' => ['required', 'in:ACTIVE,INACTIVE'],
        ];
    }
}
