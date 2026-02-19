<?php

namespace App\Models;

use App\Enums\Collectibility;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class CKPNProvision extends Model
{
    use HasUuids;

    protected $table = 'ckpn_provisions';

    protected $fillable = [
        'loan_id',
        'period',
        'collectibility',
        'outstanding_balance',
        'provision_rate',
        'provision_amount',
        'journal_entry_id',
    ];

    protected function casts(): array
    {
        return [
            'period' => 'date',
            'collectibility' => Collectibility::class,
            'outstanding_balance' => 'decimal:2',
            'provision_rate' => 'decimal:4',
            'provision_amount' => 'decimal:2',
        ];
    }

    public function loan()
    {
        return $this->belongsTo(Loan::class);
    }

    public function journalEntry()
    {
        return $this->belongsTo(JournalEntry::class);
    }
}
