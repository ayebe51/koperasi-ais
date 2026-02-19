<?php

namespace App\Models;

use App\Enums\ReferenceType;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class JournalEntry extends Model
{
    use HasUuids;

    protected $fillable = [
        'entry_number',
        'entry_date',
        'transaction_date',
        'posting_date',
        'is_posted',
        'description',
        'reference_type',
        'reference_id',
        'created_by',
        'approved_by',
        'approved_at',
        'is_reversed',
        'reversal_of',
    ];

    protected function casts(): array
    {
        return [
            'entry_date' => 'date',
            'transaction_date' => 'date',
            'posting_date' => 'datetime',
            'is_posted' => 'boolean',
            'reference_type' => ReferenceType::class,
            'approved_at' => 'datetime',
            'is_reversed' => 'boolean',
        ];
    }

    public function lines()
    {
        return $this->hasMany(JournalLine::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function reversalOf()
    {
        return $this->belongsTo(JournalEntry::class, 'reversal_of');
    }

    public function getTotalDebit(): float
    {
        return (float) $this->lines()->sum('debit');
    }

    public function getTotalCredit(): float
    {
        return (float) $this->lines()->sum('credit');
    }

    public function isBalanced(): bool
    {
        return abs($this->getTotalDebit() - $this->getTotalCredit()) < 0.01;
    }
}
