<?php

namespace App\Services\Notification;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FonnteService
{
    /**
     * Send a WhatsApp message using Fonnte API.
     *
     * @param string $target WhatsApp number (e.g., "08123456789")
     * @param string $message The message content
     * @return bool True if success, False otherwise
     */
    public function sendMessage(string $target, string $message): bool
    {
        $token = env('FONNTE_TOKEN');
        $url = env('WA_GATEWAY_URL', 'https://api.fonnte.com/send');

        if (empty($token)) {
            Log::warning('Fonnte token is not set. Cannot send WhatsApp message to ' . $target);
            return false;
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => $token,
            ])->post($url, [
                        'target' => $target,
                        'message' => $message,
                        'delay' => '1',
                    ]);

            $result = $response->json();

            if ($response->successful() && isset($result['status']) && $result['status'] === true) {
                return true;
            }

            Log::error('Fonnte send failed: ' . $response->body());
            return false;

        } catch (\Exception $e) {
            Log::error('Fonnte exception: ' . $e->getMessage());
            return false;
        }
    }
}
