<?php

namespace Tests\Unit;

use App\Services\Loan\AmortizationEngine;
use App\Services\Loan\InterestEngine;
use PHPUnit\Framework\TestCase;

class AmortizationEngineTest extends TestCase
{
    private AmortizationEngine $engine;

    protected function setUp(): void
    {
        parent::setUp();
        $this->engine = new AmortizationEngine(new InterestEngine());
    }

    // ═══════════ Schedule Generation ═══════════

    public function test_schedule_has_correct_number_of_installments(): void
    {
        $schedule = $this->engine->generateSchedule(10_000_000, 12.0, 12, '2026-01-01');
        $this->assertCount(12, $schedule);
    }

    public function test_schedule_first_installment_begins_after_start_date(): void
    {
        $schedule = $this->engine->generateSchedule(10_000_000, 12.0, 12, '2026-01-01');
        $this->assertEquals('2026-02-01', $schedule[0]['due_date']);
    }

    public function test_schedule_last_installment_ending_balance_is_zero(): void
    {
        $schedule = $this->engine->generateSchedule(10_000_000, 12.0, 12, '2026-01-01');
        $last = end($schedule);
        $this->assertEquals(0, $last['ending_balance']);
    }

    public function test_schedule_total_principal_equals_loan_amount(): void
    {
        $principal = 10_000_000;
        $schedule = $this->engine->generateSchedule($principal, 12.0, 12, '2026-01-01');

        $totalPrincipal = array_sum(array_column($schedule, 'principal_amount'));
        $this->assertEqualsWithDelta($principal, $totalPrincipal, 1.0);
    }

    public function test_schedule_each_installment_has_positive_values(): void
    {
        $schedule = $this->engine->generateSchedule(10_000_000, 12.0, 12, '2026-01-01');

        foreach ($schedule as $item) {
            $this->assertGreaterThan(0, $item['interest_amount']);
            $this->assertGreaterThan(0, $item['principal_amount']);
            $this->assertGreaterThan(0, $item['total_amount']);
            $this->assertGreaterThanOrEqual(0, $item['ending_balance']);
        }
    }

    public function test_schedule_interest_decreases_over_time(): void
    {
        $schedule = $this->engine->generateSchedule(10_000_000, 12.0, 24, '2026-01-01');

        // Interest in first installment should be higher than last
        // (amortization: interest decreases, principal increases)
        $firstInterest = $schedule[0]['interest_amount'];
        $lastInterest = end($schedule)['interest_amount'];

        $this->assertGreaterThan($lastInterest, $firstInterest);
    }

    public function test_schedule_principal_increases_over_time(): void
    {
        $schedule = $this->engine->generateSchedule(10_000_000, 12.0, 24, '2026-01-01');

        $firstPrincipal = $schedule[0]['principal_amount'];
        $lastPrincipal = end($schedule)['principal_amount'];

        $this->assertLessThan($lastPrincipal, $firstPrincipal);
    }

    public function test_schedule_balance_decreases_monotonically(): void
    {
        $schedule = $this->engine->generateSchedule(10_000_000, 12.0, 12, '2026-01-01');

        $previousBalance = PHP_FLOAT_MAX;
        foreach ($schedule as $item) {
            $this->assertLessThanOrEqual($previousBalance, $item['beginning_balance']);
            $previousBalance = $item['ending_balance'];
        }
    }

    public function test_schedule_beginning_balance_equals_previous_ending(): void
    {
        $schedule = $this->engine->generateSchedule(10_000_000, 12.0, 12, '2026-01-01');

        // First installment should begin at loan amount
        $this->assertEquals(10_000_000, $schedule[0]['beginning_balance']);

        // Each subsequent beginning = previous ending
        for ($i = 1; $i < count($schedule); $i++) {
            $this->assertEqualsWithDelta(
                $schedule[$i - 1]['ending_balance'],
                $schedule[$i]['beginning_balance'],
                0.01
            );
        }
    }

    // ═══════════ Summary ═══════════

    public function test_summary_contains_required_fields(): void
    {
        $summary = $this->engine->getSummary(10_000_000, 12.0, 12, '2026-01-01');

        $this->assertArrayHasKey('principal', $summary);
        $this->assertArrayHasKey('annual_rate', $summary);
        $this->assertArrayHasKey('term_months', $summary);
        $this->assertArrayHasKey('monthly_payment', $summary);
        $this->assertArrayHasKey('total_interest', $summary);
        $this->assertArrayHasKey('total_payment', $summary);
        $this->assertArrayHasKey('schedule', $summary);
    }

    public function test_summary_total_payment_equals_principal_plus_interest(): void
    {
        $summary = $this->engine->getSummary(10_000_000, 12.0, 12, '2026-01-01');

        $this->assertEqualsWithDelta(
            $summary['principal'] + $summary['total_interest'],
            $summary['total_payment'],
            1.0
        );
    }

    public function test_schedule_24_months(): void
    {
        $schedule = $this->engine->generateSchedule(50_000_000, 18.0, 24, '2026-01-15');
        $this->assertCount(24, $schedule);

        $totalPrincipal = array_sum(array_column($schedule, 'principal_amount'));
        $this->assertEqualsWithDelta(50_000_000, $totalPrincipal, 1.0);
        $this->assertEquals(0, end($schedule)['ending_balance']);
    }
}
