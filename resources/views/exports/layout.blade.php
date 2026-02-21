<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>{{ $title ?? 'Laporan Koperasi' }}</title>
    <style>
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 11px;
            color: #333;
            margin: 0;
            padding: 20px;
        }

        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }

        .header img {
            max-height: 60px;
            margin-bottom: 5px;
        }

        .header h2 {
            margin: 0 0 5px 0;
            font-size: 18px;
            text-transform: uppercase;
        }

        .header p {
            margin: 2px 0;
            font-size: 12px;
            color: #666;
        }

        .title {
            text-align: center;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 15px;
            text-transform: uppercase;
        }

        .meta-info {
            margin-bottom: 15px;
            font-size: 11px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        th,
        td {
            border: 1px solid #ddd;
            padding: 8px 6px;
            text-align: left;
        }

        th {
            background-color: #f4f4f4;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 10px;
        }

        .text-right {
            text-align: right;
        }

        .text-center {
            text-align: center;
        }

        .footer {
            margin-top: 40px;
            font-size: 10px;
            text-align: right;
            color: #777;
        }
    </style>
</head>

<body>

    <div class="header">
        @if(isset($kop['logo']) && $kop['logo'])
            <!-- Pastikan logo public storage bisa dibaca oleh DOMPDF -->
            <img src="{{ public_path('storage/' . $kop['logo']) }}" alt="Logo">
        @endif
        <h2>{{ $kop['name'] ?? 'KOPERASI SIMPAN PINJAM' }}</h2>
        <p>{{ $kop['address'] ?? 'Alamat Belum Diatur' }}</p>
        <p>Telp: {{ $kop['phone'] ?? '-' }}</p>
    </div>

    <div class="title">{{ $title }}</div>

    <div class="meta-info">
        <strong>Tanggal Cetak:</strong> {{ $date }}<br>
        <strong>Dicetak Oleh:</strong> Tata Usaha / Admin
    </div>

    @yield('content')

    <div class="footer">
        Dicetak otomatis dari Sistem Informasi Koperasi pada {{ date('d-m-Y H:i:s') }}
    </div>

</body>

</html>