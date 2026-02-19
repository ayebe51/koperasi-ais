<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class LoanPayment extends Model
{
    use HasUuids;

    protected $fillable = [
        'loan_id',
        'payment_date',
        'principal_paid',
        'interest_paid',
        'total_paid',
        'outstanding_balance',
        'receipt_number',
        'payment_method',
        'journal_entry_id',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'payment_date' => 'date',
            'principal_paid' => 'decimal:2',
            'interest_paid' => 'decimal:2',
            'total_paid' => 'decimal:2',
            'outstanding_balance' => 'decimal:2',
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

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
