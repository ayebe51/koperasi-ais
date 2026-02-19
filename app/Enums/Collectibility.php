<?php

namespace App\Enums;

enum Collectibility: string
{
    case LANCAR = 'LANCAR';                     // Current (0 days)
    case DALAM_PERHATIAN = 'DALAM_PERHATIAN';   // Special mention (1-90 days)
    case KURANG_LANCAR = 'KURANG_LANCAR';       // Substandard (91-180 days)
    case DIRAGUKAN = 'DIRAGUKAN';               // Doubtful (181-270 days)
    case MACET = 'MACET';                       // Loss (>270 days)

    /**
     * CKPN provision rate based on collectibility
     */
    public function provisionRate(): float
    {
        return match ($this) {
            self::LANCAR => 0.01,
            self::DALAM_PERHATIAN => 0.05,
            self::KURANG_LANCAR => 0.15,
            self::DIRAGUKAN => 0.50,
            self::MACET => 1.00,
        };
    }

    /**
     * Determine collectibility from overdue days
     */
    public static function fromOverdueDays(int $days): self
    {
        return match (true) {
            $days <= 0 => self::LANCAR,
            $days <= 90 => self::DALAM_PERHATIAN,
            $days <= 180 => self::KURANG_LANCAR,
            $days <= 270 => self::DIRAGUKAN,
            default => self::MACET,
        };
    }
}
