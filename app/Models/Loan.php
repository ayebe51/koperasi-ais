<?php

namespace App\Models;

use App\Enums\Collectibility;
use App\Enums\LoanStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Loan extends Model
{
    use HasUuids;

    protected $fillable = [
        'loan_number',
        'member_id',
        'principal_amount',
        'interest_rate',
        'term_months',
        'amortized_cost',
        'effective_interest_rate',
        'administration_fee',
        'provision_fee',
        'monthly_payment',
        'loan_date',
        'due_date',
        'status',
        'collectibility',
        'purpose',
        'approved_by',
        'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'principal_amount' => 'decimal:2',
            'interest_rate' => 'decimal:2',
            'amortized_cost' => 'decimal:2',
            'effective_interest_rate' => 'decimal:6',
            'administration_fee' => 'decimal:2',
            'provision_fee' => 'decimal:2',
            'monthly_payment' => 'decimal:2',
            'loan_date' => 'date',
            'due_date' => 'date',
            'status' => LoanStatus::class,
            'collectibility' => Collectibility::class,
            'approved_at' => 'datetime',
        ];
    }

    public function member()
    {
        return $this->belongsTo(Member::class);
    }

    public function approvedByUser()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function schedules()
    {
        return $this->hasMany(LoanSchedule::class)->orderBy('installment_number');
    }

    public function payments()
    {
        return $this->hasMany(LoanPayment::class)->orderBy('payment_date');
    }

    public function ckpnProvisions()
    {
        return $this->hasMany(CKPNProvision::class);
    }

    public function getOutstandingBalance(): float
    {
        $lastPayment = $this->payments()->orderByDesc('payment_date')->first();
        return $lastPayment ? (float) $lastPayment->outstanding_balance : (float) $this->principal_amount;
    }

    public function getOverdueDays(): int
    {
        $nextUnpaid = $this->schedules()->where('is_paid', false)->first();
        if (!$nextUnpaid) {
            return 0;
        }
        $diff = now()->diffInDays($nextUnpaid->due_date, false);
        return max(0, -$diff); // Positive if overdue
    }
}
