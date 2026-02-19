<?php

namespace App\Services\Loan;

use App\Enums\Collectibility;
use App\Enums\LoanStatus;
use App\Enums\ReferenceType;
use App\Models\CKPNProvision;
use App\Models\Loan;
use App\Services\Accounting\JournalService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * CKPN (Cadangan Kerugian Penurunan Nilai)
 *
 * Calculates loan loss provisions based on collectibility classification
 */
class CKPNService
{
    public function __construct(
        private JournalService $journalService
    ) {
    }

    /**
     * Calculate provision for a single loan
     */
    public function calculateProvision(Loan $loan): array
    {
        $overdueDays = $loan->getOverdueDays();
        $collectibility = Collectibility::fromOverdueDays($overdueDays);
        $outstanding = $loan->getOutstandingBalance();
        $rate = $collectibility->provisionRate();
        $amount = round($outstanding * $rate, 2);

        return [
            'loan_id' => $loan->id,
            'loan_number' => $loan->loan_number,
            'member_name' => $loan->member->name ?? 'N/A',
            'outstanding_balance' => $outstanding,
            'overdue_days' => $overdueDays,
            'collectibility' => $collectibility->value,
            'provision_rate' => $rate,
            'provision_amount' => $amount,
        ];
    }

    /**
     * Run monthly CKPN calculation for all active loans and create journal entries
     */
    public function runMonthlyProvision(string $period): array
    {
        $periodDate = Carbon::parse($period);
        $loans = Loan::with('member')
            ->where('status', LoanStatus::ACTIVE)
            ->get();

        $results = [];
        $totalProvision = 0;
        $previousTotalProvision = 0;

        return DB::transaction(function () use ($loans, $periodDate, &$results, &$totalProvision, &$previousTotalProvision) {
            foreach ($loans as $loan) {
                $provision = $this->calculateProvision($loan);

                // Get previous provision amount for this loan
                $previousProvision = CKPNProvision::where('loan_id', $loan->id)
                    ->where('period', '<', $periodDate->format('Y-m-d'))
                    ->orderByDesc('period')
                    ->first();

                $previousAmount = $previousProvision ? (float) $previousProvision->provision_amount : 0;
                $previousTotalProvision += $previousAmount;

                // Save provision record
                CKPNProvision::updateOrCreate(
                    ['loan_id' => $loan->id, 'period' => $periodDate->format('Y-m-d')],
                    [
                        'collectibility' => $provision['collectibility'],
                        'outstanding_balance' => $provision['outstanding_balance'],
                        'provision_rate' => $provision['provision_rate'],
                        'provision_amount' => $provision['provision_amount'],
                    ]
                );

                // Update loan collectibility
                $loan->update(['collectibility' => $provision['collectibility']]);

                $totalProvision += $provision['provision_amount'];
                $results[] = $provision;
            }

            // Calculate the change in provision (incremental approach)
            $provisionChange = round($totalProvision - $previousTotalProvision, 2);

            // Create journal entry for the change in provision
            if (abs($provisionChange) > 0.01) {
                $lines = [];

                if ($provisionChange > 0) {
                    // Increase in provision: Beban CKPN (D) / Cadangan CKPN (K)
                    $lines = [
                        ['account_code' => '5-1400', 'debit' => $provisionChange, 'credit' => 0, 'description' => 'Beban Penyisihan Piutang'],
                        ['account_code' => '1-1310', 'debit' => 0, 'credit' => $provisionChange, 'description' => 'Cadangan Kerugian Penurunan Nilai'],
                    ];
                } else {
                    // Decrease in provision: Cadangan CKPN (D) / Pemulihan Beban (K)
                    $abs = abs($provisionChange);
                    $lines = [
                        ['account_code' => '1-1310', 'debit' => $abs, 'credit' => 0, 'description' => 'Pemulihan Cadangan CKPN'],
                        ['account_code' => '5-1400', 'debit' => 0, 'credit' => $abs, 'description' => 'Pemulihan Beban Penyisihan'],
                    ];
                }

                $this->journalService->createJournal([
                    'date' => $periodDate->format('Y-m-d'),
                    'description' => "CKPN Bulanan - {$periodDate->format('F Y')}",
                    'lines' => $lines,
                    'reference_type' => ReferenceType::CKPN,
                    'auto_post' => true,
                ]);
            }

            return [
                'period' => $periodDate->format('Y-m'),
                'total_loans' => count($results),
                'total_provision' => round($totalProvision, 2),
                'provision_change' => $provisionChange,
                'details' => $results,
            ];
        });
    }
}
