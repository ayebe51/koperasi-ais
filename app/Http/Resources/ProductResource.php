<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'sell_price' => (float) $this->sell_price,
            'average_cost' => (float) $this->average_cost,
            'stock' => $this->stock,
            'cogs_method' => $this->cogs_method,
            'unit' => $this->unit,
            'min_stock' => $this->min_stock,
            'margin' => $this->stock > 0 && $this->average_cost > 0
                ? round(($this->sell_price - $this->average_cost) / $this->average_cost * 100, 1)
                : null,
            'is_low_stock' => $this->min_stock ? $this->stock <= $this->min_stock : false,
            'is_active' => (bool) $this->is_active,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
