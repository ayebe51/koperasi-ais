<?php

namespace App\Http\Requests\Payment;

use App\Enums\PaymentType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreatePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'payment_type' => ['required', Rule::enum(PaymentType::class)],
            'amount' => ['required', 'numeric', 'min:1000'],
            'loan_id' => ['required_if:payment_type,ANGSURAN_PINJAMAN', 'nullable', 'uuid', 'exists:loans,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'payment_type.required' => 'Jenis pembayaran harus dipilih',
            'amount.required' => 'Jumlah pembayaran harus diisi',
            'amount.min' => 'Minimum pembayaran QRIS adalah Rp 1.000',
            'loan_id.required_if' => 'Pinjaman harus dipilih untuk pembayaran angsuran',
            'loan_id.exists' => 'Pinjaman tidak ditemukan',
        ];
    }
}
