<?php

namespace App\Http\Requests\Loan;

use Illuminate\Foundation\Http\FormRequest;

class ApplyLoanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'member_id' => 'required|uuid|exists:members,id',
            'principal_amount' => 'required|numeric|min:100000',
            'interest_rate' => 'required|numeric|min:0|max:50',
            'term_months' => 'required|integer|min:1|max:120',
            'administration_fee' => 'nullable|numeric|min:0',
            'provision_fee' => 'nullable|numeric|min:0',
            'loan_date' => 'nullable|date',
            'purpose' => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'member_id.exists' => 'Anggota tidak ditemukan',
            'principal_amount.required' => 'Jumlah pinjaman wajib diisi',
            'principal_amount.min' => 'Jumlah pinjaman minimal Rp 100.000',
            'interest_rate.required' => 'Suku bunga wajib diisi',
            'interest_rate.max' => 'Suku bunga maksimal 50% per tahun',
            'term_months.required' => 'Jangka waktu wajib diisi',
            'term_months.max' => 'Jangka waktu maksimal 120 bulan',
        ];
    }
}
