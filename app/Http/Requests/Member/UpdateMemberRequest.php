<?php

namespace App\Http\Requests\Member;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255',
            'unit_kerja' => 'sometimes|string|max:255',
            'jabatan' => 'nullable|string',
            'status_karyawan' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'email' => 'nullable|email',
            'status' => 'sometimes|string|in:ACTIVE,CUTI,KELUAR',
        ];
    }
}
