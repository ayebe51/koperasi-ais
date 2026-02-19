<?php

namespace Tests\Unit;

use App\Services\Loan\InterestEngine;
use PHPUnit\Framework\TestCase;

class InterestEngineTest extends TestCase
{
    private InterestEngine $engine;

    protected function setUp(): void
    {
        parent::setUp();
        $this->engine = new InterestEngine();
    }

    // ═══════════ calculateMonthlyPayment ═══════════

    public function test_monthly_payment_standard_loan(): void
    {
        // 10 juta, 12% p.a., 12 bulan → ~Rp 888.488
        $payment = $this->engine->calculateMonthlyPayment(10_000_000, 0.01, 12);
        $this->assertEqualsWithDelta(888_487.89, $payment, 1.00);
    }

    public function test_monthly_payment_large_loan(): void
    {
        // 50 juta, 1% per bulan, 24 bulan
        $payment = $this->engine->calculateMonthlyPayment(50_000_000, 0.01, 24);
        $this->assertGreaterThan(0, $payment);
        // Total payments should exceed principal (interest exists)
        $total = $payment * 24;
        $this->assertGreaterThan(50_000_000, $total);
    }

    public function test_monthly_payment_zero_rate(): void
    {
        // 0% interest → simple division
        $payment = $this->engine->calculateMonthlyPayment(12_000_000, 0, 12);
        $this->assertEquals(1_000_000, $payment);
    }

    public function test_monthly_payment_known_value(): void
    {
        // Verified with financial calculator:
        // Principal: 1,000,000 | Rate: 1%/month | Term: 6 months → 172,548
        $payment = $this->engine->calculateMonthlyPayment(1_000_000, 0.01, 6);
        $this->assertEqualsWithDelta(172_548.0, $payment, 1.0);
    }

    public function test_monthly_payment_single_month(): void
    {
        // 1 month loan = principal + 1 month interest
        $payment = $this->engine->calculateMonthlyPayment(1_000_000, 0.02, 1);
        $this->assertEquals(1_020_000, $payment);
    }

    // ═══════════ calculateEIR ═══════════

    public function test_eir_no_fees_equals_nominal_rate(): void
    {
        // No fees → EIR should equal nominal rate
        $eir = $this->engine->calculateEIR(10_000_000, 12.0, 0, 12);
        $this->assertEqualsWithDelta(0.12, $eir, 0.001);
    }

    public function test_eir_with_fees_higher_than_nominal(): void
    {
        // With fees, EIR should be HIGHER than nominal rate
        // This is a fundamental SAK EP requirement
        $eir = $this->engine->calculateEIR(10_000_000, 12.0, 500_000, 12);
        $this->assertGreaterThan(0.12, $eir);
    }

    public function test_eir_higher_fees_means_higher_eir(): void
    {
        $eir1 = $this->engine->calculateEIR(10_000_000, 12.0, 200_000, 12);
        $eir2 = $this->engine->calculateEIR(10_000_000, 12.0, 500_000, 12);
        $eir3 = $this->engine->calculateEIR(10_000_000, 12.0, 1_000_000, 12);

        // Higher fees → higher effective rate
        $this->assertGreaterThan($eir1, $eir2);
        $this->assertGreaterThan($eir2, $eir3);
    }

    public function test_eir_longer_term_less_impact_from_fees(): void
    {
        // Same fees, longer term → fees spread over more months → lower EIR impact
        $eir12 = $this->engine->calculateEIR(10_000_000, 12.0, 500_000, 12);
        $eir24 = $this->engine->calculateEIR(10_000_000, 12.0, 500_000, 24);
        $eir36 = $this->engine->calculateEIR(10_000_000, 12.0, 500_000, 36);

        // EIR should decrease as term lengthens (fees amortized over more periods)
        $this->assertGreaterThan($eir24, $eir12);
        $this->assertGreaterThan($eir36, $eir24);
    }

    public function test_eir_returns_positive_value(): void
    {
        $eir = $this->engine->calculateEIR(10_000_000, 12.0, 300_000, 12);
        $this->assertGreaterThan(0, $eir);
    }

    // ═══════════ calculateTotalInterest ═══════════

    public function test_total_interest_calculation(): void
    {
        $totalInterest = $this->engine->calculateTotalInterest(10_000_000, 0.01, 12);
        // Total interest should be positive
        $this->assertGreaterThan(0, $totalInterest);
        // Total interest should be less than principal for reasonable rates
        $this->assertLessThan(10_000_000, $totalInterest);
    }

    public function test_total_interest_zero_rate(): void
    {
        $totalInterest = $this->engine->calculateTotalInterest(10_000_000, 0, 12);
        $this->assertEquals(0, $totalInterest);
    }

    public function test_total_interest_known_value(): void
    {
        // 1,000,000 @ 1%/month for 6 months
        // Monthly payment ≈ 172,548
        // Total: 172,548 × 6 = 1,035,288
        // Total interest: 1,035,288 - 1,000,000 = 35,288
        $totalInterest = $this->engine->calculateTotalInterest(1_000_000, 0.01, 6);
        $this->assertEqualsWithDelta(35_288, $totalInterest, 10);
    }
}
