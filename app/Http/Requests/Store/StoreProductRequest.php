<?php

namespace App\Http\Requests\Store;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code' => 'required|string|unique:products,code',
            'name' => 'required|string|max:255',
            'sell_price' => 'required|numeric|min:0',
            'cogs_method' => 'required|string|in:FIFO,AVERAGE',
            'description' => 'nullable|string',
            'unit' => 'nullable|string|max:20',
            'min_stock' => 'nullable|integer|min:0',
        ];
    }

    public function messages(): array
    {
        return [
            'code.unique' => 'Kode produk sudah terdaftar',
            'cogs_method.in' => 'Metode HPP harus FIFO atau AVERAGE',
        ];
    }
}
