<?php

namespace App\Models;

use App\Enums\COGSMethod;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasUuids;

    protected $fillable = [
        'code',
        'name',
        'category',
        'unit',
        'sell_price',
        'stock',
        'cogs_method',
        'average_cost',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'sell_price' => 'decimal:2',
            'average_cost' => 'decimal:2',
            'cogs_method' => COGSMethod::class,
            'is_active' => 'boolean',
        ];
    }

    public function batches()
    {
        return $this->hasMany(ProductBatch::class)->orderBy('purchase_date');
    }

    public function availableBatches()
    {
        return $this->batches()->where('remaining_qty', '>', 0)->orderBy('purchase_date');
    }
}
