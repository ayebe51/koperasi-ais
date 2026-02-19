<?php

namespace App\Http\Requests\Member;

use Illuminate\Foundation\Http\FormRequest;

class StoreMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'member_number' => 'required|string|unique:members,member_number',
            'nik' => 'required|string|size:16|unique:members,nik',
            'nuptk' => 'nullable|string',
            'name' => 'required|string|max:255',
            'unit_kerja' => 'required|string|max:255',
            'jabatan' => 'nullable|string',
            'status_karyawan' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'email' => 'nullable|email',
            'join_date' => 'required|date',
        ];
    }

    public function messages(): array
    {
        return [
            'member_number.required' => 'Nomor anggota wajib diisi',
            'member_number.unique' => 'Nomor anggota sudah terdaftar',
            'nik.required' => 'NIK wajib diisi',
            'nik.size' => 'NIK harus 16 digit',
            'nik.unique' => 'NIK sudah terdaftar',
            'name.required' => 'Nama wajib diisi',
            'unit_kerja.required' => 'Unit kerja wajib diisi',
            'join_date.required' => 'Tanggal bergabung wajib diisi',
        ];
    }
}
