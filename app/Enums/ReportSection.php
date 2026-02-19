<?php

namespace App\Enums;

enum ReportSection: string
{
    case CURRENT_ASSET = 'CURRENT_ASSET';
    case FIXED_ASSET = 'FIXED_ASSET';
    case CURRENT_LIABILITY = 'CURRENT_LIABILITY';
    case LONG_TERM_LIABILITY = 'LONG_TERM_LIABILITY';
    case MEMBER_EQUITY = 'MEMBER_EQUITY';
    case RETAINED_SURPLUS = 'RETAINED_SURPLUS';     // Cadangan & SHU
    case RESERVE_FUND = 'RESERVE_FUND';
    case OPERATING_REVENUE = 'OPERATING_REVENUE';
    case OTHER_REVENUE = 'OTHER_REVENUE';            // Pendapatan Lain-lain
    case OPERATING_EXPENSE = 'OPERATING_EXPENSE';
    case OTHER_EXPENSE = 'OTHER_EXPENSE';            // Beban Lain-lain
}
