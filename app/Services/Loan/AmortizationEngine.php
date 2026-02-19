<?php

namespace App\Services\Loan;

use Carbon\Carbon;

/**
 * SAK EP: Amortization Schedule Generator
 *
 * Generates loan repayment schedules using the effective interest method
 */
class AmortizationEngine
{
    public function __construct(
        private InterestEngine $interestEngine
    ) {
    }

    /**
     * Generate amortization schedule
     *
     * @param float  $principal   Pokok pinjaman
     * @param float  $annualRate  Suku bunga per tahun (%)
     * @param int    $termMonths  Jangka waktu (bulan)
     * @param string $startDate   Tanggal mulai (Y-m-d)
     * @return array Array of schedule items
     */
    public function generateSchedule(
        float $principal,
        float $annualRate,
        int $termMonths,
        string $startDate
    ): array {
        $monthlyRate = ($annualRate / 100) / 12;
        $monthlyPayment = $this->interestEngine->calculateMonthlyPayment($principal, $monthlyRate, $termMonths);

        $balance = $principal;
        $schedule = [];
        $date = Carbon::parse($startDate);

        for ($i = 1; $i <= $termMonths; $i++) {
            $dueDate = $date->copy()->addMonths($i);
            $interestAmount = round($balance * $monthlyRate, 2);
            $principalAmount = round($monthlyPayment - $interestAmount, 2);

            // Last installment: adjust for rounding
            if ($i === $termMonths) {
                $principalAmount = round($balance, 2);
                $monthlyPaymentAdjusted = $principalAmount + $interestAmount;
            } else {
                $monthlyPaymentAdjusted = $monthlyPayment;
            }

            $endingBalance = round($balance - $principalAmount, 2);

            $schedule[] = [
                'installment_number' => $i,
                'due_date' => $dueDate->format('Y-m-d'),
                'beginning_balance' => round($balance, 2),
                'interest_amount' => $interestAmount,
                'principal_amount' => $principalAmount,
                'total_amount' => round($monthlyPaymentAdjusted, 2),
                'ending_balance' => max(0, $endingBalance),
            ];

            $balance = max(0, $endingBalance);
        }

        return $schedule;
    }

    /**
     * Get summary of the amortization
     */
    public function getSummary(float $principal, float $annualRate, int $termMonths, string $startDate): array
    {
        $schedule = $this->generateSchedule($principal, $annualRate, $termMonths, $startDate);
        $totalInterest = array_sum(array_column($schedule, 'interest_amount'));
        $totalPayment = array_sum(array_column($schedule, 'total_amount'));

        return [
            'principal' => $principal,
            'annual_rate' => $annualRate,
            'term_months' => $termMonths,
            'monthly_payment' => $schedule[0]['total_amount'] ?? 0,
            'total_interest' => round($totalInterest, 2),
            'total_payment' => round($totalPayment, 2),
            'start_date' => $startDate,
            'end_date' => end($schedule)['due_date'] ?? $startDate,
            'schedule' => $schedule,
        ];
    }
}
