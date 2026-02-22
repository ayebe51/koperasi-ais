<?php

namespace App\Services\Loan;

use App\Enums\LoanStatus;
use App\Enums\ReferenceType;
use App\Models\Loan;
use App\Models\LoanPayment;
use App\Models\LoanSchedule;
use App\Models\Member;
use App\Services\Accounting\JournalService;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class LoanService
{
    public function __construct(
        private InterestEngine $interestEngine,
        private AmortizationEngine $amortizationEngine,
        private JournalService $journalService
    ) {
    }

    /**
     * Create a loan application
     */
    public function applyLoan(array $data): Loan
    {
        $member = Member::findOrFail($data['member_id']);

        $monthlyRate = ($data['interest_rate'] / 100) / 12;
        $monthlyPayment = $this->interestEngine->calculateMonthlyPayment(
            $data['principal_amount'],
            $monthlyRate,
            $data['term_months']
        );

        $eir = $this->interestEngine->calculateEIR(
            $data['principal_amount'],
            $data['interest_rate'],
            ($data['administration_fee'] ?? 0) + ($data['provision_fee'] ?? 0),
            $data['term_months']
        );

        return Loan::create([
            'loan_number' => $this->generateLoanNumber(),
            'member_id' => $data['member_id'],
            'principal_amount' => $data['principal_amount'],
            'interest_rate' => $data['interest_rate'],
            'term_months' => $data['term_months'],
            'monthly_payment' => $monthlyPayment,
            'effective_interest_rate' => $eir,
            'administration_fee' => $data['administration_fee'] ?? 0,
            'provision_fee' => $data['provision_fee'] ?? 0,
            'amortized_cost' => $data['principal_amount'] - ($data['administration_fee'] ?? 0) - ($data['provision_fee'] ?? 0),
            'loan_date' => $data['loan_date'] ?? now()->toDateString(),
            'due_date' => now()->addMonths($data['term_months'])->toDateString(),
            'purpose' => $data['purpose'] ?? null,
            'status' => LoanStatus::PENDING,
        ]);
    }

    /**
     * Approve loan and generate amortization schedule + journal entries
     */
    public function approveLoan(string $loanId, int $approvedBy, ?bool $isChairman = false): Loan
    {
        $loan = Loan::with('member')->findOrFail($loanId);
        $settings = \Illuminate\Support\Facades\Cache::get('koperasi_settings', []);
        $threshold = $settings['multi_level_approval_threshold'] ?? 50000000;

        if (!in_array($loan->status, [LoanStatus::PENDING, LoanStatus::WAITING_CHAIRMAN_APPROVAL])) {
            throw new InvalidArgumentException('Loan status cannot be approved at this stage');
        }

        return DB::transaction(function () use ($loan, $approvedBy, $isChairman, $threshold) {

            // Scenario 1: Pending loan requires chairman approval (Plafon > Threshold)
            // UPDATE: As requested by user, ALL loans require Chairman approval now.
            if ($loan->status === LoanStatus::PENDING && !$isChairman) {
                // If it's already a Chairman approving directly from PENDING, they can bypass manager level or they approve as chairman.
                // Assuming normal flow: Manager approves first.
                $loan->update([
                    'status' => LoanStatus::WAITING_CHAIRMAN_APPROVAL,
                    'manager_approved_by' => $approvedBy,
                    'manager_approved_at' => now(),
                ]);

                if ($loan->member && $loan->member->user_id) {
                    \App\Models\Notification::create([
                        'user_id' => $loan->member->user_id,
                        'type' => 'LOAN_WAITING_CHAIRMAN',
                        'title' => 'Pinjaman Menunggu Persetujuan Ketua',
                        'message' => "Pengajuan pinjaman Anda dengan nomor {$loan->loan_number} telah disetujui Manajer dan sedang menunggu persetujuan Ketua.",
                        'data' => ['loan_id' => $loan->id, 'loan_number' => $loan->loan_number],
                    ]);
                }

                return $loan; // Stop here, no schedule/journal yet
            }

            // Scenario 2: Final Approval (Either Plafon <= Threshold OR already Waiting for Chairman)
            $updateData = [
                'status' => LoanStatus::ACTIVE,
                'approved_by' => $approvedBy, // Final approver
                'approved_at' => now(),
            ];

            if ($loan->status === LoanStatus::WAITING_CHAIRMAN_APPROVAL) {
                $updateData['chairman_approved_by'] = $approvedBy;
                $updateData['chairman_approved_at'] = now();
            } else {
                $updateData['manager_approved_by'] = $approvedBy;
                $updateData['manager_approved_at'] = now();
            }

            $loan->update($updateData);

            if ($loan->member && $loan->member->user_id) {
                \App\Models\Notification::create([
                    'user_id' => $loan->member->user_id,
                    'type' => 'LOAN_APPROVED',
                    'title' => 'Pinjaman Disetujui',
                    'message' => "Pengajuan pinjaman Anda dengan nomor {$loan->loan_number} telah disetujui.",
                    'data' => ['loan_id' => $loan->id, 'loan_number' => $loan->loan_number],
                ]);
            }

            // Generate amortization schedule
            $schedule = $this->amortizationEngine->generateSchedule(
                (float) $loan->principal_amount,
                (float) $loan->interest_rate,
                $loan->term_months,
                $loan->loan_date->format('Y-m-d')
            );

            foreach ($schedule as $item) {
                LoanSchedule::create([
                    'loan_id' => $loan->id,
                    ...$item,
                ]);
            }

            // Create disbursement journal: Piutang Pinjaman (D) / Kas (K)
            $journalLines = [
                ['account_code' => '1-1300', 'debit' => (float) $loan->principal_amount, 'credit' => 0, 'description' => 'Piutang Pinjaman Anggota'],
                ['account_code' => '1-1100', 'debit' => 0, 'credit' => (float) $loan->principal_amount, 'description' => 'Pencairan Pinjaman'],
            ];

            // If there are fees, record them as revenue
            $fees = (float) $loan->administration_fee + (float) $loan->provision_fee;
            if ($fees > 0) {
                $journalLines[1]['credit'] -= $fees; // Reduce cash outflow
                $journalLines[] = ['account_code' => '4-1200', 'debit' => 0, 'credit' => (float) $loan->administration_fee, 'description' => 'Pendapatan Administrasi'];
                if ((float) $loan->provision_fee > 0) {
                    $journalLines[] = ['account_code' => '4-1300', 'debit' => 0, 'credit' => (float) $loan->provision_fee, 'description' => 'Pendapatan Provisi'];
                }
            }

            $this->journalService->createJournal([
                'date' => $loan->loan_date->format('Y-m-d'),
                'description' => "Pencairan Pinjaman {$loan->loan_number} - {$loan->member->name}",
                'lines' => $journalLines,
                'reference_type' => ReferenceType::LOAN,
                'reference_id' => $loan->id,
                'created_by' => $approvedBy,
                'auto_post' => true,
            ]);

            return $loan->load('schedules');
        });
    }

    /**
     * Process a loan payment (cicilan)
     */
    public function processPayment(string $loanId, array $data): LoanPayment
    {
        $loan = Loan::with(['schedules', 'member'])->findOrFail($loanId);

        if ($loan->status !== LoanStatus::ACTIVE) {
            throw new InvalidArgumentException('Loan is not active');
        }

        $nextSchedule = $loan->schedules()->where('is_paid', false)->first();
        if (!$nextSchedule) {
            throw new InvalidArgumentException('All installments already paid');
        }

        return DB::transaction(function () use ($loan, $nextSchedule, $data) {
            $principalPaid = (float) $nextSchedule->principal_amount;
            $interestPaid = (float) $nextSchedule->interest_amount;
            $totalPaid = $principalPaid + $interestPaid;
            $outstandingBalance = (float) $nextSchedule->ending_balance;

            // Mark schedule as paid
            $nextSchedule->update([
                'is_paid' => true,
                'paid_date' => $data['payment_date'] ?? now()->toDateString(),
                'paid_amount' => $totalPaid,
            ]);

            // Create payment record
            $payment = LoanPayment::create([
                'loan_id' => $loan->id,
                'payment_date' => $data['payment_date'] ?? now()->toDateString(),
                'principal_paid' => $principalPaid,
                'interest_paid' => $interestPaid,
                'total_paid' => $totalPaid,
                'outstanding_balance' => $outstandingBalance,
                'receipt_number' => $this->generateReceiptNumber(),
                'payment_method' => $data['payment_method'] ?? 'CASH',
                'created_by' => $data['created_by'] ?? null,
            ]);

            // Auto-journal: Kas (D) / Piutang Pinjaman (K) + Pendapatan Bunga (K)
            $journal = $this->journalService->createJournal([
                'date' => $payment->payment_date->format('Y-m-d'),
                'description' => "Angsuran ke-{$nextSchedule->installment_number} Pinjaman {$loan->loan_number} - {$loan->member->name}",
                'lines' => [
                    ['account_code' => '1-1100', 'debit' => $totalPaid, 'credit' => 0, 'description' => 'Penerimaan Kas'],
                    ['account_code' => '1-1300', 'debit' => 0, 'credit' => $principalPaid, 'description' => 'Pelunasan Pokok'],
                    ['account_code' => '4-1100', 'debit' => 0, 'credit' => $interestPaid, 'description' => 'Pendapatan Jasa Pinjaman'],
                ],
                'reference_type' => ReferenceType::LOAN_PAYMENT,
                'reference_id' => $payment->id,
                'created_by' => $data['created_by'] ?? null,
                'auto_post' => true,
            ]);

            $payment->update(['journal_entry_id' => $journal->id]);

            // Check if loan is fully paid
            $remainingSchedules = $loan->schedules()->where('is_paid', false)->count();
            if ($remainingSchedules === 0) {
                $loan->update(['status' => LoanStatus::PAID_OFF]);
            }

            // Update amortized cost
            $loan->update(['amortized_cost' => $outstandingBalance]);

            return $payment->load('loan.member');
        });
    }

    private function generateLoanNumber(): string
    {
        $date = now()->format('Ym');
        $last = Loan::where('loan_number', 'like', "LN-{$date}-%")
            ->orderByDesc('loan_number')
            ->first();

        $seq = 1;
        if ($last) {
            $parts = explode('-', $last->loan_number);
            $seq = (int) end($parts) + 1;
        }

        return sprintf("LN-%s-%04d", $date, $seq);
    }

    private function generateReceiptNumber(): string
    {
        $date = now()->format('Ymd');
        $last = LoanPayment::where('receipt_number', 'like', "RCV-{$date}-%")
            ->orderByDesc('receipt_number')
            ->first();

        $seq = 1;
        if ($last) {
            $parts = explode('-', $last->receipt_number);
            $seq = (int) end($parts) + 1;
        }

        return sprintf("RCV-%s-%04d", $date, $seq);
    }
}
