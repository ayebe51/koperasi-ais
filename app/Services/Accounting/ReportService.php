<?php

namespace App\Services\Accounting;

use App\Enums\AccountCategory;
use App\Models\ChartOfAccount;
use App\Models\JournalLine;
use Carbon\Carbon;

/**
 * Financial Report Generator
 * Generates SAK EP-compliant financial statements
 */
class ReportService
{
    /**
     * Generate Balance Sheet (Laporan Posisi Keuangan)
     */
    public function getBalanceSheet(?string $asOfDate = null): array
    {
        $date = $asOfDate ?? now()->toDateString();

        $balances = $this->getAccountBalances($date);

        $assets = $this->filterByCategory($balances, AccountCategory::ASSET);
        $liabilities = $this->filterByCategory($balances, AccountCategory::LIABILITY);
        $equity = $this->filterByCategory($balances, AccountCategory::EQUITY);

        $totalAssets = $this->sumBalances($assets);
        $totalLiabilities = $this->sumBalances($liabilities);
        $totalEquity = $this->sumBalances($equity);

        return [
            'report_name' => 'Laporan Posisi Keuangan',
            'as_of_date' => $date,
            'assets' => [
                'accounts' => $assets,
                'total' => $totalAssets,
            ],
            'liabilities' => [
                'accounts' => $liabilities,
                'total' => $totalLiabilities,
            ],
            'equity' => [
                'accounts' => $equity,
                'total' => $totalEquity,
            ],
            'total_liabilities_equity' => round($totalLiabilities + $totalEquity, 2),
            'is_balanced' => abs($totalAssets - ($totalLiabilities + $totalEquity)) < 0.01,
        ];
    }

    /**
     * Generate Income Statement / Perhitungan SHU
     */
    public function getIncomeStatement(string $startDate, string $endDate): array
    {
        $balances = $this->getAccountBalancesPeriod($startDate, $endDate);

        $revenue = $this->filterByCategory($balances, AccountCategory::REVENUE);
        $expenses = $this->filterByCategory($balances, AccountCategory::EXPENSE);

        $totalRevenue = $this->sumBalances($revenue);
        $totalExpenses = $this->sumBalances($expenses);
        $netIncome = round($totalRevenue - $totalExpenses, 2);

        return [
            'report_name' => 'Perhitungan Sisa Hasil Usaha',
            'period' => ['start' => $startDate, 'end' => $endDate],
            'revenue' => [
                'accounts' => $revenue,
                'total' => $totalRevenue,
            ],
            'expenses' => [
                'accounts' => $expenses,
                'total' => $totalExpenses,
            ],
            'net_shu' => $netIncome,
        ];
    }

    /**
     * Generate Cash Flow Statement (simplified direct method)
     */
    public function getCashFlow(string $startDate, string $endDate): array
    {
        $cashAccount = ChartOfAccount::where('code', '1-1100')->first();
        if (!$cashAccount) {
            return ['error' => 'Cash account (1-1100) not found'];
        }

        $cashLines = JournalLine::where('account_id', $cashAccount->id)
            ->whereHas('journalEntry', function ($q) use ($startDate, $endDate) {
                $q->where('is_posted', true)
                    ->whereBetween('transaction_date', [$startDate, $endDate]);
            })
            ->with('journalEntry')
            ->get();

        $totalInflow = (float) $cashLines->sum('debit');
        $totalOutflow = (float) $cashLines->sum('credit');

        return [
            'report_name' => 'Laporan Arus Kas',
            'period' => ['start' => $startDate, 'end' => $endDate],
            'total_cash_inflow' => round($totalInflow, 2),
            'total_cash_outflow' => round($totalOutflow, 2),
            'net_cash_flow' => round($totalInflow - $totalOutflow, 2),
        ];
    }

    private function getAccountBalances(string $asOfDate): array
    {
        $accounts = ChartOfAccount::where('is_active', true)->orderBy('code')->get();
        $result = [];

        foreach ($accounts as $account) {
            $debits = (float) JournalLine::where('account_id', $account->id)
                ->whereHas('journalEntry', fn($q) => $q->where('is_posted', true)->where('transaction_date', '<=', $asOfDate))
                ->sum('debit');

            $credits = (float) JournalLine::where('account_id', $account->id)
                ->whereHas('journalEntry', fn($q) => $q->where('is_posted', true)->where('transaction_date', '<=', $asOfDate))
                ->sum('credit');

            $balance = $account->normal_balance->value === 'DEBIT' ? ($debits - $credits) : ($credits - $debits);

            if (abs($balance) > 0.01) {
                $result[] = [
                    'code' => $account->code,
                    'name' => $account->name,
                    'category' => $account->category->value,
                    'balance' => round($balance, 2),
                ];
            }
        }

        return $result;
    }

    private function getAccountBalancesPeriod(string $startDate, string $endDate): array
    {
        $accounts = ChartOfAccount::where('is_active', true)
            ->whereIn('category', [AccountCategory::REVENUE, AccountCategory::EXPENSE])
            ->orderBy('code')
            ->get();

        $result = [];

        foreach ($accounts as $account) {
            $debits = (float) JournalLine::where('account_id', $account->id)
                ->whereHas('journalEntry', fn($q) =>
                    $q->where('is_posted', true)->whereBetween('transaction_date', [$startDate, $endDate]))
                ->sum('debit');

            $credits = (float) JournalLine::where('account_id', $account->id)
                ->whereHas('journalEntry', fn($q) =>
                    $q->where('is_posted', true)->whereBetween('transaction_date', [$startDate, $endDate]))
                ->sum('credit');

            $balance = $account->normal_balance->value === 'DEBIT' ? ($debits - $credits) : ($credits - $debits);

            if (abs($balance) > 0.01) {
                $result[] = [
                    'code' => $account->code,
                    'name' => $account->name,
                    'category' => $account->category->value,
                    'balance' => round($balance, 2),
                ];
            }
        }

        return $result;
    }

    private function filterByCategory(array $balances, AccountCategory $category): array
    {
        return array_values(array_filter($balances, fn($b) => $b['category'] === $category->value));
    }

    private function sumBalances(array $accounts): float
    {
        return round(array_sum(array_column($accounts, 'balance')), 2);
    }
}
