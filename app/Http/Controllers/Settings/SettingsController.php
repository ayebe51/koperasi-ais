<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SettingsController extends Controller
{
    use ApiResponse;

    private const CACHE_KEY = 'koperasi_settings';

    private array $defaults = [
        'nama_koperasi' => 'Koperasi AIS Ma\'arif Cilacap',
        'alamat' => '',
        'telepon' => '',
        'email_koperasi' => '',
        'bunga_pinjaman' => 1.5,
        'denda_keterlambatan' => 0.5,
        'simpanan_pokok' => 100000,
        'simpanan_wajib' => 50000,
        'persentase_shu_anggota' => 40,
        'persentase_shu_cadangan' => 20,
        'persentase_shu_maarif' => 17.5,
        'persentase_shu_pendidikan' => 5,
        'persentase_shu_sosial' => 5,
        'persentase_shu_pengurus' => 12.5,
    ];

    /**
     * GET /api/settings
     */
    public function index(): JsonResponse
    {
        $settings = Cache::rememberForever(self::CACHE_KEY, function () {
            return $this->defaults;
        });

        return $this->success($settings, 'Pengaturan koperasi');
    }

    /**
     * PUT /api/settings
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama_koperasi' => 'required|string|max:255',
            'alamat' => 'nullable|string|max:500',
            'telepon' => 'nullable|string|max:30',
            'email_koperasi' => 'nullable|email|max:255',
            'bunga_pinjaman' => 'required|numeric|min:0|max:100',
            'denda_keterlambatan' => 'required|numeric|min:0|max:100',
            'simpanan_pokok' => 'required|numeric|min:0',
            'simpanan_wajib' => 'required|numeric|min:0',
            'persentase_shu_anggota' => 'required|numeric|min:0|max:100',
            'persentase_shu_cadangan' => 'required|numeric|min:0|max:100',
            'persentase_shu_maarif' => 'required|numeric|min:0|max:100',
            'persentase_shu_pendidikan' => 'required|numeric|min:0|max:100',
            'persentase_shu_sosial' => 'required|numeric|min:0|max:100',
            'persentase_shu_pengurus' => 'required|numeric|min:0|max:100',
        ]);

        Cache::forever(self::CACHE_KEY, $validated);

        return $this->success($validated, 'Pengaturan berhasil disimpan');
    }
}
