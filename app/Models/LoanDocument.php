<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class LoanDocument extends Model
{
    use HasUuids;

    protected $fillable = [
        'loan_id',
        'document_type',
        'file_name',
        'file_path',
        'mime_type',
        'file_size',
    ];

    public function loan()
    {
        return $this->belongsTo(Loan::class);
    }
}
