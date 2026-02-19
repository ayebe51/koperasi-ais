<?php

return [
    /*
    |--------------------------------------------------------------------------
    | DOKU Payment Gateway Configuration
    |--------------------------------------------------------------------------
    */

    'client_id' => env('DOKU_CLIENT_ID', ''),
    'secret_key' => env('DOKU_SECRET_KEY', ''),
    'is_production' => env('DOKU_IS_PRODUCTION', false),

    // QRIS expiry in minutes (default: 30 minutes)
    'qris_expiry_minutes' => env('DOKU_QRIS_EXPIRY', 30),
];
