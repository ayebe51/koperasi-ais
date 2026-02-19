<?php

namespace App\Services\Loan;

/**
 * SAK EP: Effective Interest Rate Calculator
 *
 * Calculates the EIR that discounts all future cash flows (principal + interest)
 * to equal the net loan proceeds (principal - fees).
 */
class InterestEngine
{
    /**
     * Calculate Effective Interest Rate (EIR)
     *
     * Uses Newton-Raphson method (IRR calculation) to find the monthly rate
     * that equates the present value of all payments to the net loan amount.
     *
     * @param float $principal     Pokok pinjaman
     * @param float $nominalRate   Suku bunga nominal per tahun (%)
     * @param float $fees          Total biaya (admin + provisi)
     * @param int   $termMonths    Jangka waktu (bulan)
     * @return float EIR per tahun (decimal, e.g., 0.15 = 15%)
     */
    public function calculateEIR(float $principal, float $nominalRate, float $fees, int $termMonths): float
    {
        $netProceeds = $principal - $fees;

        if ($fees <= 0) {
            return $nominalRate / 100;
        }

        // Monthly payment using nominal rate
        $monthlyNominal = ($nominalRate / 100) / 12;
        $monthlyPayment = $this->calculateMonthlyPayment($principal, $monthlyNominal, $termMonths);

        // Newton-Raphson to find monthly EIR
        $guess = $monthlyNominal; // Start with nominal rate
        $tolerance = 0.0000001;
        $maxIterations = 100;

        for ($i = 0; $i < $maxIterations; $i++) {
            $npv = -$netProceeds;
            $dnpv = 0;

            for ($t = 1; $t <= $termMonths; $t++) {
                $discount = pow(1 + $guess, -$t);
                $npv += $monthlyPayment * $discount;
                $dnpv -= $t * $monthlyPayment * pow(1 + $guess, -$t - 1);
            }

            if (abs($dnpv) < $tolerance)
                break;

            $newGuess = $guess - ($npv / $dnpv);

            if (abs($newGuess - $guess) < $tolerance) {
                return round($newGuess * 12, 6); // Convert monthly to annual
            }

            $guess = $newGuess;
        }

        return round($guess * 12, 6);
    }

    /**
     * Calculate monthly payment using annuity formula
     *
     * @param float $principal      Pokok pinjaman
     * @param float $monthlyRate    Suku bunga per bulan (decimal)
     * @param int   $termMonths     Jangka waktu (bulan)
     * @return float Pembayaran per bulan
     */
    public function calculateMonthlyPayment(float $principal, float $monthlyRate, int $termMonths): float
    {
        if ($monthlyRate <= 0) {
            return $principal / $termMonths;
        }

        $factor = pow(1 + $monthlyRate, $termMonths);
        return round($principal * ($monthlyRate * $factor) / ($factor - 1), 2);
    }

    /**
     * Calculate total interest over the loan term
     */
    public function calculateTotalInterest(float $principal, float $monthlyRate, int $termMonths): float
    {
        $monthlyPayment = $this->calculateMonthlyPayment($principal, $monthlyRate, $termMonths);
        return round(($monthlyPayment * $termMonths) - $principal, 2);
    }
}
