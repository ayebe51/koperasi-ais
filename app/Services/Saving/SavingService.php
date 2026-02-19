<?php

namespace App\Services\Saving;

use App\Enums\ReferenceType;
use App\Enums\SavingType;
use App\Enums\TransactionType;
use App\Models\Member;
use App\Models\MemberEquity;
use App\Models\Saving;
use App\Services\Accounting\JournalService;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class SavingService
{
    public function __construct(
        private JournalService $journalService
    ) {
    }

    /**
     * Deposit savings (setor simpanan)
     */
    public function deposit(array $data): Saving
    {
        $member = Member::findOrFail($data['member_id']);
        $type = SavingType::from($data['type']);
        $amount = (float) $data['amount'];

        if ($amount <= 0) {
            throw new InvalidArgumentException('Amount must be positive');
        }

        return DB::transaction(function () use ($member, $type, $amount, $data) {
            $currentBalance = $member->getSavingBalance($type->value);
            $newBalance = $currentBalance + $amount;

            // Create saving record
            $saving = Saving::create([
                'member_id' => $member->id,
                'type' => $type,
                'amount' => $amount,
                'transaction_type' => TransactionType::DEPOSIT,
                'transaction_date' => $data['date'] ?? now()->toDateString(),
                'balance' => $newBalance,
                'description' => $data['description'] ?? null,
                'reference_number' => $data['reference_number'] ?? null,
            ]);

            // Determine accounts based on saving type
            $accountMapping = $this->getAccountMapping($type);

            // Auto-journal: Kas (D) / Simpanan (K)
            $journal = $this->journalService->createJournal([
                'date' => $saving->transaction_date->format('Y-m-d'),
                'description' => "Setoran {$type->value} - {$member->name}",
                'lines' => [
                    ['account_code' => '1-1100', 'debit' => $amount, 'credit' => 0, 'description' => 'Penerimaan Kas'],
                    ['account_code' => $accountMapping['account'], 'debit' => 0, 'credit' => $amount, 'description' => $accountMapping['label']],
                ],
                'reference_type' => ReferenceType::SAVING,
                'reference_id' => $saving->id,
                'auto_post' => true,
            ]);

            $saving->update(['journal_entry_id' => $journal->id]);

            // Update member equity
            $this->updateMemberEquity($member, $type, $amount);

            return $saving->load('member');
        });
    }

    /**
     * Withdraw savings (tarik simpanan - only SUKARELA)
     */
    public function withdraw(array $data): Saving
    {
        $member = Member::findOrFail($data['member_id']);
        $type = SavingType::from($data['type']);
        $amount = (float) $data['amount'];

        if ($type !== SavingType::SUKARELA) {
            throw new InvalidArgumentException('Withdrawal only allowed for Simpanan Sukarela');
        }

        $currentBalance = $member->getSavingBalance($type->value);
        if ($currentBalance < $amount) {
            throw new InvalidArgumentException("Insufficient balance: available {$currentBalance}, requested {$amount}");
        }

        return DB::transaction(function () use ($member, $type, $amount, $currentBalance, $data) {
            $newBalance = $currentBalance - $amount;

            $saving = Saving::create([
                'member_id' => $member->id,
                'type' => $type,
                'amount' => $amount,
                'transaction_type' => TransactionType::WITHDRAWAL,
                'transaction_date' => $data['date'] ?? now()->toDateString(),
                'balance' => $newBalance,
                'description' => $data['description'] ?? null,
            ]);

            // Auto-journal: Simpanan Sukarela (D) / Kas (K)
            $journal = $this->journalService->createJournal([
                'date' => $saving->transaction_date->format('Y-m-d'),
                'description' => "Penarikan Simpanan Sukarela - {$member->name}",
                'lines' => [
                    ['account_code' => '2-1100', 'debit' => $amount, 'credit' => 0, 'description' => 'Penarikan Simpanan Sukarela'],
                    ['account_code' => '1-1100', 'debit' => 0, 'credit' => $amount, 'description' => 'Pengeluaran Kas'],
                ],
                'reference_type' => ReferenceType::SAVING,
                'reference_id' => $saving->id,
                'auto_post' => true,
            ]);

            $saving->update(['journal_entry_id' => $journal->id]);

            return $saving->load('member');
        });
    }

    /**
     * Account mapping per saving type
     *
     * SAK EP: Simpanan Pokok & Wajib = Ekuitas, Simpanan Sukarela = Kewajiban
     */
    private function getAccountMapping(SavingType $type): array
    {
        return match ($type) {
            SavingType::POKOK => ['account' => '3-1100', 'label' => 'Simpanan Pokok'],
            SavingType::WAJIB => ['account' => '3-1200', 'label' => 'Simpanan Wajib'],
            SavingType::SUKARELA => ['account' => '2-1100', 'label' => 'Simpanan Sukarela Anggota'],
        };
    }

    private function updateMemberEquity(Member $member, SavingType $type, float $amount): void
    {
        $equity = MemberEquity::firstOrCreate(
            ['member_id' => $member->id],
            ['simpanan_pokok' => 0, 'simpanan_wajib' => 0, 'total_ekuitas' => 0]
        );

        match ($type) {
            SavingType::POKOK => $equity->increment('simpanan_pokok', $amount),
            SavingType::WAJIB => $equity->increment('simpanan_wajib', $amount),
            SavingType::SUKARELA => null, // Sukarela is a liability, not equity
        };

        $equity->refresh();
        $equity->recalculateTotal();
    }
}
