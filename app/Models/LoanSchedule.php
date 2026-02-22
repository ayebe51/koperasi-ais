<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class LoanSchedule extends Model
{
    use HasUuids;

    protected $fillable = [
        'loan_id',
        'installment_number',
        'due_date',
        'beginning_balance',
        'principal_amount',
        'interest_amount',
        'total_amount',
        'ending_balance',
        'is_paid',
        'paid_date',
        'paid_amount',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'paid_date' => 'date',
            'beginning_balance' => 'decimal:2',
            'principal_amount' => 'decimal:2',
            'interest_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'ending_balance' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'is_paid' => 'boolean',
            'reminder_sent_at' => 'datetime',
        ];
    }

    public function loan()
    {
        return $this->belongsTo(Loan::class);
    }
}
