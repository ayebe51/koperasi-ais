<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SavingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'member' => $this->when($this->relationLoaded('member'), fn() => [
                'id' => $this->member->id,
                'name' => $this->member->name,
                'member_number' => $this->member->member_number,
            ]),
            'type' => $this->type,
            'transaction_type' => $this->transaction_type,
            'amount' => (float) $this->amount,
            'balance' => (float) $this->balance,
            'transaction_date' => $this->transaction_date?->format('Y-m-d'),
            'description' => $this->description,
            'reference_number' => $this->reference_number,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
