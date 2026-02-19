<?php

namespace App\Http\Requests\Accounting;

use Illuminate\Foundation\Http\FormRequest;

class StoreJournalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date' => 'required|date',
            'description' => 'required|string|max:500',
            'lines' => 'required|array|min:2',
            'lines.*.account_code' => 'required|string|exists:chart_of_accounts,code',
            'lines.*.debit' => 'required|numeric|min:0',
            'lines.*.credit' => 'required|numeric|min:0',
            'lines.*.description' => 'nullable|string',
            'auto_post' => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'date.required' => 'Tanggal jurnal wajib diisi',
            'description.required' => 'Deskripsi wajib diisi',
            'lines.required' => 'Jurnal harus memiliki minimal 2 baris',
            'lines.min' => 'Jurnal harus memiliki minimal 2 baris',
            'lines.*.account_code.exists' => 'Kode akun :input tidak ditemukan',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $lines = $this->input('lines', []);
            $totalDebit = array_sum(array_column($lines, 'debit'));
            $totalCredit = array_sum(array_column($lines, 'credit'));

            if (abs($totalDebit - $totalCredit) > 0.01) {
                $validator->errors()->add('lines', "Jurnal tidak seimbang: Debit={$totalDebit}, Kredit={$totalCredit}");
            }

            foreach ($lines as $i => $line) {
                if (($line['debit'] ?? 0) > 0 && ($line['credit'] ?? 0) > 0) {
                    $validator->errors()->add("lines.{$i}", 'Baris jurnal tidak boleh memiliki debit dan kredit sekaligus');
                }
                if (($line['debit'] ?? 0) == 0 && ($line['credit'] ?? 0) == 0) {
                    $validator->errors()->add("lines.{$i}", 'Baris jurnal harus memiliki debit atau kredit');
                }
            }
        });
    }
}
