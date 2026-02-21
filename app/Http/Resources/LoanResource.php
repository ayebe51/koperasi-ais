<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LoanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'loan_number' => $this->loan_number,
            'member' => $this->when($this->relationLoaded('member'), fn() => [
                'id' => $this->member->id,
                'name' => $this->member->name,
                'member_number' => $this->member->member_number,
            ]),
            'principal_amount' => (float) $this->principal_amount,
            'interest_rate' => (float) $this->interest_rate,
            'effective_rate' => (float) $this->effective_rate,
            'term_months' => $this->term_months,
            'monthly_payment' => (float) $this->monthly_payment,
            'total_paid' => (float) $this->total_paid,
            'remaining_balance' => (float) ($this->principal_amount - $this->total_paid),
            'status' => $this->status,
            'collectibility' => $this->collectibility,
            'loan_date' => $this->loan_date?->format('Y-m-d'),
            'approved_at' => $this->approved_at?->toISOString(),
            'purpose' => $this->purpose,
            'rejection_reason' => $this->rejection_reason,
            'documents' => $this->whenLoaded('documents', function () {
                return $this->documents->map(fn($d) => [
                    'id' => $d->id,
                    'document_type' => $d->document_type,
                    'file_name' => $d->file_name,
                    'file_path' => $d->file_path,
                ]);
            }),
            'schedule' => $this->whenLoaded('schedules', function () {
                return $this->schedules->map(fn($s) => [
                    'installment_no' => $s->installment_no,
                    'due_date' => $s->due_date->format('Y-m-d'),
                    'principal' => (float) $s->principal_amount,
                    'interest' => (float) $s->interest_amount,
                    'total' => (float) $s->total_amount,
                    'is_paid' => $s->is_paid,
                ]);
            }),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
