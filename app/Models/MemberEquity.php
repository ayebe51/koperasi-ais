<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class MemberEquity extends Model
{
    use HasUuids;

    protected $fillable = [
        'member_id',
        'simpanan_pokok',
        'simpanan_wajib',
        'modal_penyertaan',
        'shu_belum_dibagikan',
        'shu_tahun_berjalan',
        'total_ekuitas',
    ];

    protected function casts(): array
    {
        return [
            'simpanan_pokok' => 'decimal:2',
            'simpanan_wajib' => 'decimal:2',
            'modal_penyertaan' => 'decimal:2',
            'shu_belum_dibagikan' => 'decimal:2',
            'shu_tahun_berjalan' => 'decimal:2',
            'total_ekuitas' => 'decimal:2',
        ];
    }

    public function member()
    {
        return $this->belongsTo(Member::class);
    }

    public function recalculateTotal(): void
    {
        $this->total_ekuitas = $this->simpanan_pokok
            + $this->simpanan_wajib
            + $this->modal_penyertaan
            + $this->shu_belum_dibagikan
            + $this->shu_tahun_berjalan;
        $this->save();
    }
}
