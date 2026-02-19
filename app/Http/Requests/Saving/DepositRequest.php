<?php

namespace App\Http\Requests\Saving;

use Illuminate\Foundation\Http\FormRequest;

class DepositRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'member_id' => 'required|uuid|exists:members,id',
            'type' => 'required|string|in:POKOK,WAJIB,SUKARELA',
            'amount' => 'required|numeric|min:1000',
            'date' => 'nullable|date',
            'description' => 'nullable|string|max:255',
            'reference_number' => 'nullable|string|max:50',
        ];
    }

    public function messages(): array
    {
        return [
            'member_id.required' => 'ID anggota wajib diisi',
            'member_id.exists' => 'Anggota tidak ditemukan',
            'type.required' => 'Jenis simpanan wajib diisi',
            'type.in' => 'Jenis simpanan harus POKOK, WAJIB, atau SUKARELA',
            'amount.required' => 'Jumlah setoran wajib diisi',
            'amount.min' => 'Jumlah setoran minimal Rp 1.000',
        ];
    }
}
