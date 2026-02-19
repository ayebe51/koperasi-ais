<?php

namespace App\Services\Accounting;

use App\Enums\ReferenceType;
use App\Models\ChartOfAccount;
use App\Models\JournalEntry;
use App\Models\JournalLine;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class JournalService
{
    /**
     * Create a journal entry with auto-validation of debit = credit
     *
     * @param array{
     *   date: string,
     *   description: string,
     *   lines: array<array{account_code: string, debit: float, credit: float, description?: string}>,
     *   reference_type?: ReferenceType,
     *   reference_id?: string,
     *   created_by?: int,
     *   auto_post?: bool
     * } $data
     */
    public function createJournal(array $data): JournalEntry
    {
        $this->validateLines($data['lines']);

        return DB::transaction(function () use ($data) {
            $entry = JournalEntry::create([
                'entry_number' => $this->generateEntryNumber(),
                'entry_date' => $data['date'],
                'transaction_date' => $data['date'],
                'description' => $data['description'],
                'reference_type' => $data['reference_type'] ?? null,
                'reference_id' => $data['reference_id'] ?? null,
                'created_by' => $data['created_by'] ?? null,
                'is_posted' => $data['auto_post'] ?? false,
                'posting_date' => ($data['auto_post'] ?? false) ? now() : null,
            ]);

            foreach ($data['lines'] as $line) {
                $account = ChartOfAccount::where('code', $line['account_code'])->firstOrFail();

                JournalLine::create([
                    'journal_entry_id' => $entry->id,
                    'account_id' => $account->id,
                    'debit' => $line['debit'] ?? 0,
                    'credit' => $line['credit'] ?? 0,
                    'description' => $line['description'] ?? null,
                ]);
            }

            return $entry->load('lines.account');
        });
    }

    /**
     * Post a journal entry (make it affect the GL)
     */
    public function postJournal(string $journalId): JournalEntry
    {
        $entry = JournalEntry::findOrFail($journalId);

        if ($entry->is_posted) {
            throw new InvalidArgumentException('Journal entry already posted');
        }

        if (!$entry->isBalanced()) {
            throw new InvalidArgumentException('Journal entry is not balanced (debit ≠ credit)');
        }

        $entry->update([
            'is_posted' => true,
            'posting_date' => now(),
        ]);

        return $entry;
    }

    /**
     * Create a reversal journal entry
     */
    public function reverseJournal(string $journalId, ?string $reason = null): JournalEntry
    {
        $original = JournalEntry::with('lines.account')->findOrFail($journalId);

        if (!$original->is_posted) {
            throw new InvalidArgumentException('Cannot reverse an unposted journal');
        }

        if ($original->is_reversed) {
            throw new InvalidArgumentException('Journal already reversed');
        }

        return DB::transaction(function () use ($original, $reason) {
            $reversal = JournalEntry::create([
                'entry_number' => $this->generateEntryNumber(),
                'entry_date' => now()->toDateString(),
                'transaction_date' => now()->toDateString(),
                'description' => "REVERSAL: " . ($reason ?? $original->description),
                'reference_type' => $original->reference_type,
                'reference_id' => $original->reference_id,
                'is_posted' => true,
                'posting_date' => now(),
                'reversal_of' => $original->id,
            ]);

            // Swap debit and credit
            foreach ($original->lines as $line) {
                JournalLine::create([
                    'journal_entry_id' => $reversal->id,
                    'account_id' => $line->account_id,
                    'debit' => $line->credit,
                    'credit' => $line->debit,
                    'description' => 'Reversal',
                ]);
            }

            $original->update(['is_reversed' => true]);

            return $reversal->load('lines.account');
        });
    }

    /**
     * Get ledger (buku besar) for a specific account
     */
    public function getLedger(string $accountCode, ?string $startDate = null, ?string $endDate = null): array
    {
        $account = ChartOfAccount::where('code', $accountCode)->firstOrFail();

        $query = JournalLine::with('journalEntry')
            ->where('account_id', $account->id)
            ->whereHas('journalEntry', function ($q) use ($startDate, $endDate) {
                $q->where('is_posted', true);
                if ($startDate)
                    $q->where('entry_date', '>=', $startDate);
                if ($endDate)
                    $q->where('entry_date', '<=', $endDate);
            })
            ->orderBy('created_at');

        $lines = $query->get();
        $runningBalance = 0;

        $ledger = $lines->map(function ($line) use ($account, &$runningBalance) {
            $isDebitNormal = $account->normal_balance->value === 'DEBIT';
            $runningBalance += $isDebitNormal
                ? ((float) $line->debit - (float) $line->credit)
                : ((float) $line->credit - (float) $line->debit);

            $entryDate = $line->journalEntry->entry_date ?? $line->journalEntry->transaction_date;

            return [
                'date' => $entryDate ? $entryDate->format('Y-m-d') : now()->format('Y-m-d'),
                'entry_number' => $line->journalEntry->entry_number,
                'description' => $line->journalEntry->description,
                'debit' => (float) $line->debit,
                'credit' => (float) $line->credit,
                'balance' => round($runningBalance, 2),
            ];
        });

        return [
            'account' => $account->toArray(),
            'entries' => $ledger->toArray(),
            'closing_balance' => round($runningBalance, 2),
        ];
    }

    /**
     * Generate trial balance
     */
    public function getTrialBalance(?string $asOfDate = null): array
    {
        $accounts = ChartOfAccount::where('is_active', true)
            ->orderBy('code')
            ->get();

        $trial = [];
        $totalDebit = 0;
        $totalCredit = 0;

        foreach ($accounts as $account) {
            $query = JournalLine::where('account_id', $account->id)
                ->whereHas('journalEntry', function ($q) use ($asOfDate) {
                    $q->where('is_posted', true);
                    if ($asOfDate)
                        $q->where('entry_date', '<=', $asOfDate);
                });

            $debits = (float) $query->sum('debit');
            $credits = (float) $query->sum('credit');
            $balance = $debits - $credits;

            if (abs($balance) < 0.01)
                continue; // Skip zero-balance accounts

            $row = [
                'code' => $account->code,
                'name' => $account->name,
                'category' => $account->category->value,
                'debit_balance' => $balance > 0 ? round($balance, 2) : 0,
                'credit_balance' => $balance < 0 ? round(abs($balance), 2) : 0,
            ];

            $totalDebit += $row['debit_balance'];
            $totalCredit += $row['credit_balance'];
            $trial[] = $row;
        }

        return [
            'as_of_date' => $asOfDate ?? now()->toDateString(),
            'accounts' => $trial,
            'total_debit' => round($totalDebit, 2),
            'total_credit' => round($totalCredit, 2),
            'is_balanced' => abs($totalDebit - $totalCredit) < 0.01,
        ];
    }

    private function validateLines(array $lines): void
    {
        if (count($lines) < 2) {
            throw new InvalidArgumentException('Journal must have at least 2 lines');
        }

        $totalDebit = array_sum(array_column($lines, 'debit'));
        $totalCredit = array_sum(array_column($lines, 'credit'));

        if (abs($totalDebit - $totalCredit) > 0.01) {
            throw new InvalidArgumentException(
                "Debit ({$totalDebit}) must equal Credit ({$totalCredit})"
            );
        }
    }

    private function generateEntryNumber(): string
    {
        $date = now()->format('Ymd');
        $last = JournalEntry::where('entry_number', 'like', "JE-{$date}-%")
            ->orderByDesc('entry_number')
            ->first();

        $seq = 1;
        if ($last) {
            $parts = explode('-', $last->entry_number);
            $seq = (int) end($parts) + 1;
        }

        return sprintf("JE-%s-%04d", $date, $seq);
    }
}
