<?php

namespace Tests\Unit;

use App\Enums\Collectibility;
use PHPUnit\Framework\TestCase;

class CollectibilityTest extends TestCase
{
    // ═══════════ fromOverdueDays ═══════════

    public function test_zero_days_is_lancar(): void
    {
        $this->assertEquals(Collectibility::LANCAR, Collectibility::fromOverdueDays(0));
    }

    public function test_negative_days_is_lancar(): void
    {
        $this->assertEquals(Collectibility::LANCAR, Collectibility::fromOverdueDays(-5));
    }

    public function test_1_day_overdue_is_dalam_perhatian(): void
    {
        $this->assertEquals(Collectibility::DALAM_PERHATIAN, Collectibility::fromOverdueDays(1));
    }

    public function test_90_days_is_dalam_perhatian(): void
    {
        $this->assertEquals(Collectibility::DALAM_PERHATIAN, Collectibility::fromOverdueDays(90));
    }

    public function test_91_days_is_kurang_lancar(): void
    {
        $this->assertEquals(Collectibility::KURANG_LANCAR, Collectibility::fromOverdueDays(91));
    }

    public function test_180_days_is_kurang_lancar(): void
    {
        $this->assertEquals(Collectibility::KURANG_LANCAR, Collectibility::fromOverdueDays(180));
    }

    public function test_181_days_is_diragukan(): void
    {
        $this->assertEquals(Collectibility::DIRAGUKAN, Collectibility::fromOverdueDays(181));
    }

    public function test_270_days_is_diragukan(): void
    {
        $this->assertEquals(Collectibility::DIRAGUKAN, Collectibility::fromOverdueDays(270));
    }

    public function test_271_days_is_macet(): void
    {
        $this->assertEquals(Collectibility::MACET, Collectibility::fromOverdueDays(271));
    }

    public function test_365_days_is_macet(): void
    {
        $this->assertEquals(Collectibility::MACET, Collectibility::fromOverdueDays(365));
    }

    // ═══════════ provisionRate ═══════════

    public function test_lancar_rate_is_1_percent(): void
    {
        $this->assertEquals(0.01, Collectibility::LANCAR->provisionRate());
    }

    public function test_dalam_perhatian_rate_is_5_percent(): void
    {
        $this->assertEquals(0.05, Collectibility::DALAM_PERHATIAN->provisionRate());
    }

    public function test_kurang_lancar_rate_is_15_percent(): void
    {
        $this->assertEquals(0.15, Collectibility::KURANG_LANCAR->provisionRate());
    }

    public function test_diragukan_rate_is_50_percent(): void
    {
        $this->assertEquals(0.50, Collectibility::DIRAGUKAN->provisionRate());
    }

    public function test_macet_rate_is_100_percent(): void
    {
        $this->assertEquals(1.00, Collectibility::MACET->provisionRate());
    }

    // ═══════════ Boundary Tests ═══════════

    /**
     * Provision rates should increase with worse collectibility
     */
    public function test_provision_rates_increase_monotonically(): void
    {
        $rates = [
            Collectibility::LANCAR->provisionRate(),
            Collectibility::DALAM_PERHATIAN->provisionRate(),
            Collectibility::KURANG_LANCAR->provisionRate(),
            Collectibility::DIRAGUKAN->provisionRate(),
            Collectibility::MACET->provisionRate(),
        ];

        for ($i = 1; $i < count($rates); $i++) {
            $this->assertGreaterThan($rates[$i - 1], $rates[$i]);
        }
    }

    /**
     * Every overdue day should map to exactly one collectibility
     */
    public function test_all_boundaries_covered(): void
    {
        // Test the exact boundary points (0, 1, 90, 91, 180, 181, 270, 271)
        $boundaries = [
            [0, 'LANCAR'],
            [1, 'DALAM_PERHATIAN'],
            [90, 'DALAM_PERHATIAN'],
            [91, 'KURANG_LANCAR'],
            [180, 'KURANG_LANCAR'],
            [181, 'DIRAGUKAN'],
            [270, 'DIRAGUKAN'],
            [271, 'MACET'],
        ];

        foreach ($boundaries as [$days, $expected]) {
            $this->assertEquals(
                $expected,
                Collectibility::fromOverdueDays($days)->value,
                "Failed for {$days} days, expected {$expected}"
            );
        }
    }
}
