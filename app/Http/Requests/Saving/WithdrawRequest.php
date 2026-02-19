<?php

namespace App\Http\Requests\Saving;

use Illuminate\Foundation\Http\FormRequest;

class WithdrawRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'member_id' => 'required|uuid|exists:members,id',
            'type' => 'required|string|in:SUKARELA',
            'amount' => 'required|numeric|min:1000',
            'date' => 'nullable|date',
            'description' => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'type.in' => 'Penarikan hanya diperbolehkan untuk Simpanan Sukarela',
            'amount.min' => 'Jumlah penarikan minimal Rp 1.000',
        ];
    }
}
