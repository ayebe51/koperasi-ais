<?php

namespace App\Enums;

enum ReferenceType: string
{
    case SAVING = 'SAVING';
    case LOAN = 'LOAN';
    case LOAN_PAYMENT = 'LOAN_PAYMENT';
    case SALE = 'SALE';
    case PURCHASE = 'PURCHASE';
    case CKPN = 'CKPN';
    case SHU_DISTRIBUTION = 'SHU_DISTRIBUTION';
    case DEPRECIATION = 'DEPRECIATION';
    case QRIS_PAYMENT = 'QRIS_PAYMENT';
    case MANUAL = 'MANUAL';
}
