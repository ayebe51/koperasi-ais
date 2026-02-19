<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ProductBatch extends Model
{
    use HasUuids;

    protected $fillable = [
        'product_id',
        'purchase_date',
        'quantity',
        'remaining_qty',
        'unit_cost',
        'supplier',
        'reference',
    ];

    protected function casts(): array
    {
        return [
            'purchase_date' => 'date',
            'unit_cost' => 'decimal:2',
        ];
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
