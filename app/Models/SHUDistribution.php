<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class SHUDistribution extends Model
{
    use HasUuids;

    protected $table = 'shu_distributions';

    protected $fillable = [
        'fiscal_year',
        'member_id',
        'jasa_simpanan',
        'jasa_pinjaman',
        'jasa_usaha',
        'total_shu',
        'is_paid',
        'paid_date',
        'journal_entry_id',
    ];

    protected function casts(): array
    {
        return [
            'jasa_simpanan' => 'decimal:2',
            'jasa_pinjaman' => 'decimal:2',
            'jasa_usaha' => 'decimal:2',
            'total_shu' => 'decimal:2',
            'is_paid' => 'boolean',
            'paid_date' => 'date',
        ];
    }

    public function member()
    {
        return $this->belongsTo(Member::class);
    }
    public function journalEntry()
    {
        return $this->belongsTo(JournalEntry::class);
    }
}
