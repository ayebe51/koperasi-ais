<?php

namespace App\Models;

use App\Enums\SavingType;
use App\Enums\TransactionType;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Saving extends Model
{
    use HasUuids;

    protected $fillable = [
        'member_id',
        'type',
        'amount',
        'transaction_type',
        'transaction_date',
        'balance',
        'description',
        'reference_number',
        'journal_entry_id',
    ];

    protected function casts(): array
    {
        return [
            'type' => SavingType::class,
            'transaction_type' => TransactionType::class,
            'amount' => 'decimal:2',
            'balance' => 'decimal:2',
            'transaction_date' => 'date',
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
