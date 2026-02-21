@extends('exports.layout')

@section('content')
    <table class="table">
        <thead>
            <tr>
                <th>No</th>
                <th>No. Pinjaman</th>
                <th>Tgl Pengajuan</th>
                <th>Nama Anggota</th>
                <th class="text-right">Pokok Pinjaman</th>
                <th class="text-center">Tenor</th>
                <th class="text-right">Cicilan/Bulan</th>
                <th class="text-right">Sisa Tagihan</th>
                <th class="text-center">Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($data as $index => $row)
                <tr>
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td>{{ $row->loan_number }}</td>
                    <td>{{ \Carbon\Carbon::parse($row->created_at)->format('d/m/Y') }}</td>
                    <td>{{ $row->member->name ?? '-' }}<br><small>{{ $row->member->member_number ?? '' }}</small></td>
                    <td class="text-right">Rp {{ number_format($row->principal_amount, 0, ',', '.') }}</td>
                    <td class="text-center">{{ $row->term_months }} bln</td>
                    <td class="text-right">Rp {{ number_format($row->monthly_payment, 0, ',', '.') }}</td>
                    <td class="text-right"><strong>Rp {{ number_format($row->outstanding_balance, 0, ',', '.') }}</strong></td>
                    <td class="text-center">{{ $row->status->value ?? $row->status }}</td>
                </tr>
            @endforeach

            @if(count($data) === 0)
                <tr>
                    <td colspan="9" class="text-center">Tidak ada data transaksi.</td>
                </tr>
            @else
                <tr>
                    <td colspan="4" class="text-right"><strong>TOTAL RESIDU (SISA TAGIHAN AKTIF):</strong></td>
                    <td colspan="5"><strong>Rp {{ number_format($data->sum('outstanding_balance'), 0, ',', '.') }}</strong></td>
                </tr>
            @endif
        </tbody>
    </table>
@endsection