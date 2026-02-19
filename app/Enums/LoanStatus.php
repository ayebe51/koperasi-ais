<?php

namespace App\Enums;

enum LoanStatus: string
{
    case PENDING = 'PENDING';
    case APPROVED = 'APPROVED';
    case ACTIVE = 'ACTIVE';
    case PAID_OFF = 'PAID_OFF';
    case DEFAULTED = 'DEFAULTED';
    case REJECTED = 'REJECTED';
}
