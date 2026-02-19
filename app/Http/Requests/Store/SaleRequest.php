<?php

namespace App\Http\Requests\Store;

use Illuminate\Foundation\Http\FormRequest;

class SaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|uuid|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.sell_price' => 'nullable|numeric|min:0',
            'payment_method' => 'nullable|string|in:CASH,TRANSFER,QRIS',
            'customer_name' => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'items.required' => 'Minimal 1 item penjualan',
            'items.*.product_id.exists' => 'Produk tidak ditemukan',
            'items.*.quantity.min' => 'Jumlah item minimal 1',
        ];
    }
}
