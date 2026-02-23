<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BankMutation extends Model
{
    protected $fillable = [
        'transaction_date',
        'description',
        'amount',
        'type',
        'balance_after',
        'bank_name',
        'reference_id',
        'status',
        'reconciled_to_type',
        'reconciled_to_id',
        'journal_entry_id',
    ];

    protected $casts = [
        'transaction_date' => 'date',
        'amount' => 'float',
        'balance_after' => 'float',
    ];

    public function journalEntry()
    {
        return $this->belongsTo(JournalEntry::class);
    }
}
