<?php

namespace App\Enums;

enum MemberStatus: string
{
    case ACTIVE = 'ACTIVE';
    case CUTI = 'CUTI';
    case KELUAR = 'KELUAR';
}
