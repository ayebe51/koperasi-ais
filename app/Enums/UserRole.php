<?php

namespace App\Enums;

enum UserRole: string
{
    case ADMIN = 'ADMIN';
    case MANAGER = 'MANAGER';
    case TELLER = 'TELLER';
    case ACCOUNTANT = 'ACCOUNTANT';
    case MEMBER = 'MEMBER';
}
