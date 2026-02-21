@extends('exports.layout')

@section('content')
    <table class="table">
        <thead>
            <tr>
                <th>No</th>
                <th>No. Anggota</th>
                <th>Nama Lengkap</th>
                <th>NIK</th>
                <th>Unit Kerja</th>
                <th class="text-center">Tgl Gabung</th>
                <th class="text-center">Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($data as $index => $row)
                <tr>
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td><strong>{{ $row->member_number }}</strong></td>
                    <td>{{ $row->name }}</td>
                    <td>{{ $row->nik }}</td>
                    <td>{{ $row->unit_kerja ?? '-' }}</td>
                    <td class="text-center">{{ \Carbon\Carbon::parse($row->join_date)->format('d M Y') }}</td>
                    <td class="text-center">
                        {{ $row->status->value ?? $row->status }}
                    </td>
                </tr>
            @endforeach

            @if(count($data) === 0)
                <tr>
                    <td colspan="7" class="text-center">Tidak ada data anggota.</td>
                </tr>
            @endif
        </tbody>
    </table>
@endsection