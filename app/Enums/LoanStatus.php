<?php

namespace App\Enums;

enum LoanStatus: string
{
    case PENDING = 'PENDING';
    case WAITING_CHAIRMAN_APPROVAL = 'WAITING_CHAIRMAN_APPROVAL';
    case APPROVED = 'APPROVED';
    case ACTIVE = 'ACTIVE';
    case PAID_OFF = 'PAID_OFF';
    case DEFAULTED = 'DEFAULTED';
    case REJECTED = 'REJECTED';
}
