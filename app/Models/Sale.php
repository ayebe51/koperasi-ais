<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Sale extends Model
{
    use HasUuids;

    protected $fillable = [
        'sale_number',
        'sale_date',
        'member_id',
        'subtotal',
        'discount',
        'total',
        'total_cogs',
        'payment_method',
        'payment_status',
        'journal_entry_id',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'sale_date' => 'date',
            'subtotal' => 'decimal:2',
            'discount' => 'decimal:2',
            'total' => 'decimal:2',
            'total_cogs' => 'decimal:2',
        ];
    }

    public function member()
    {
        return $this->belongsTo(Member::class);
    }
    public function items()
    {
        return $this->hasMany(SaleItem::class);
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
