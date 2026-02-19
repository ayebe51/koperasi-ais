<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Rencana Prosentase Pembagian SHU
    |--------------------------------------------------------------------------
    |
    | Persentase alokasi SHU sesuai AD/ART koperasi.
    | Total harus = 100% (1.0).
    | Ubah nilai di bawah sesuai keputusan RAT.
    |
    */

    'allocations' => [
        'jasa_anggota' => 0.40,   // 40% — Jasa Anggota
        'cadangan_umum' => 0.20,   // 20% — Cadangan
        'lembaga_maarif' => 0.175,  // 17.5% — Lembaga Ma'arif
        'dana_pendidikan' => 0.05,   // 5% — Pendidikan Anggota
        'dana_sosial' => 0.05,   // 5% — Sosial
        'dana_pengurus' => 0.125,  // 12.5% — Pengurus
    ],

    /*
    |--------------------------------------------------------------------------
    | Rasio dalam Jasa Anggota (40%)
    |--------------------------------------------------------------------------
    |
    | Bagaimana 40% jasa anggota dibagi:
    | - simpanan: proporsional saldo simpanan anggota
    | - pinjaman: proporsional bunga pinjaman dibayar
    |
    */

    'jasa_anggota_ratio' => [
        'simpanan' => 0.50,  // 50% of 40% = 20% dari net SHU
        'pinjaman' => 0.50,  // 50% of 40% = 20% dari net SHU
    ],

    /*
    |--------------------------------------------------------------------------
    | Kode Akun (COA) untuk Posting Jurnal SHU
    |--------------------------------------------------------------------------
    */

    'accounts' => [
        'shu_tahun_berjalan' => '3-1600',
        'cadangan_umum' => '3-1400',
        'lembaga_maarif' => '2-1800',  // Akun baru untuk Lembaga Ma'arif
        'dana_pendidikan' => '2-1500',
        'dana_sosial' => '2-1600',
        'dana_pengurus' => '2-1700',
        'shu_belum_dibagi' => '3-1500',
    ],

];
