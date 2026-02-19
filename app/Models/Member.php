<?php

namespace App\Models;

use App\Enums\MemberStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Member extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'user_id',
        'member_number',
        'nik',
        'nuptk',
        'name',
        'unit_kerja',
        'jabatan',
        'status_karyawan',
        'phone',
        'address',
        'email',
        'join_date',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'join_date' => 'date',
            'status' => MemberStatus::class,
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function equity()
    {
        return $this->hasOne(MemberEquity::class);
    }

    public function savings()
    {
        return $this->hasMany(Saving::class);
    }

    public function loans()
    {
        return $this->hasMany(Loan::class);
    }

    public function shuDistributions()
    {
        return $this->hasMany(SHUDistribution::class);
    }

    /**
     * Get current balance for a specific saving type
     */
    public function getSavingBalance(string $type): float
    {
        $latest = $this->savings()
            ->where('type', $type)
            ->orderByDesc('transaction_date')
            ->orderByDesc('created_at')
            ->first();

        return $latest ? (float) $latest->balance : 0;
    }
}
