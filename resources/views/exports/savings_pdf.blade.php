@extends('exports.layout')

@section('content')
    <table class="table">
        <thead>
            <tr>
                <th>No</th>
                <th>Tanggal Transaksi</th>
                <th>Nama Anggota</th>
                <th>Jenis Simpanan</th>
                <th class="text-center">Tipe Transaksi</th>
                <th class="text-right">Jumlah</th>
                <th class="text-right">Saldo Setelahnya</th>
            </tr>
        </thead>
        <tbody>
            @foreach($data as $index => $row)
                <tr>
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td>{{ \Carbon\Carbon::parse($row->transaction_date)->format('d M Y') }}</td>
                    <td>{{ $row->member->name ?? '-' }}<br><small>{{ $row->member->member_number ?? '' }}</small></td>
                    <td>{{ $row->saving_type->value ?? $row->type }}</td>
                    <td class="text-center">
                        @if(($row->transaction_type->value ?? $row->transaction_type) === 'DEPOSIT')
                            Pemasukan
                        @else
                            Penarikan
                        @endif
                    </td>
                    <td class="text-right">Rp {{ number_format($row->amount, 0, ',', '.') }}</td>
                    <td class="text-right"><strong>Rp {{ number_format($row->balance, 0, ',', '.') }}</strong></td>
                </tr>
            @endforeach

            @if(count($data) === 0)
                <tr>
                    <td colspan="7" class="text-center">Tidak ada histori simpanan.</td>
                </tr>
            @endif
        </tbody>
    </table>
@endsection