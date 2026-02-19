<?php

namespace App\Models;

use App\Enums\PaymentStatus;
use App\Enums\PaymentType;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasUuids;

    protected $fillable = [
        'member_id',
        'payment_type',
        'amount',
        'status',
        'midtrans_order_id',
        'midtrans_transaction_id',
        'qris_url',
        'qris_string',
        'loan_id',
        'saving_type',
        'journal_entry_id',
        'paid_at',
        'expired_at',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'payment_type' => PaymentType::class,
            'status' => PaymentStatus::class,
            'amount' => 'decimal:2',
            'paid_at' => 'datetime',
            'expired_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function member()
    {
        return $this->belongsTo(Member::class);
    }

    public function loan()
    {
        return $this->belongsTo(Loan::class);
    }

    public function journalEntry()
    {
        return $this->belongsTo(JournalEntry::class);
    }

    /**
     * Check if the payment is still pending and can be paid
     */
    public function isPending(): bool
    {
        return $this->status === PaymentStatus::PENDING;
    }

    /**
     * Check if the payment has expired
     */
    public function isExpired(): bool
    {
        return $this->status === PaymentStatus::EXPIRED
            || ($this->isPending() && $this->expired_at && $this->expired_at->isPast());
    }
}
