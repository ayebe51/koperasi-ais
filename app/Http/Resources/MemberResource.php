<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'member_number' => $this->member_number,
            'nik' => $this->nik,
            'name' => $this->name,
            'unit_kerja' => $this->unit_kerja,
            'jabatan' => $this->jabatan,
            'status' => $this->status,
            'phone' => $this->phone,
            'email' => $this->email,
            'join_date' => $this->join_date?->format('Y-m-d'),
            'exit_date' => $this->exit_date?->format('Y-m-d'),
            'savings' => $this->when($this->relationLoaded('equity'), function () {
                return [
                    'simpanan_pokok' => (float) ($this->equity->simpanan_pokok ?? 0),
                    'simpanan_wajib' => (float) ($this->equity->simpanan_wajib ?? 0),
                    'simpanan_sukarela' => (float) ($this->equity->simpanan_sukarela ?? 0),
                ];
            }),
            'active_loans_count' => $this->when($this->active_loans_count !== null, $this->active_loans_count),
            'has_account' => !is_null($this->user_id),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
