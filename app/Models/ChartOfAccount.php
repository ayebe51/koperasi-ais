<?php

namespace App\Models;

use App\Enums\AccountCategory;
use App\Enums\BalanceType;
use App\Enums\ReportSection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ChartOfAccount extends Model
{
    use HasUuids;

    protected $fillable = [
        'code',
        'name',
        'category',
        'normal_balance',
        'parent_id',
        'is_cooperative_specific',
        'report_section',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_cooperative_specific' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function parent()
    {
        return $this->belongsTo(ChartOfAccount::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(ChartOfAccount::class, 'parent_id');
    }

    public function journalLines()
    {
        return $this->hasMany(JournalLine::class, 'account_id');
    }

    /**
     * Calculate current balance from posted journal entries
     */
    public function getCurrentBalance(): float
    {
        $debits = $this->journalLines()
            ->whereHas('journalEntry', fn($q) => $q->where('is_posted', true))
            ->sum('debit');

        $credits = $this->journalLines()
            ->whereHas('journalEntry', fn($q) => $q->where('is_posted', true))
            ->sum('credit');

        if (strtoupper($this->normal_balance) === 'DEBIT') {
            return $debits - $credits;
        }

        return $credits - $debits;
    }
}
