<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Http\Requests\Accounting\StoreJournalRequest;
use App\Http\Traits\ApiResponse;
use App\Models\ChartOfAccount;
use App\Models\JournalEntry;
use App\Services\Accounting\JournalService;
use App\Services\Accounting\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountingController extends Controller
{
    use ApiResponse;

    public function __construct(
        private JournalService $journalService,
        private ReportService $reportService
    ) {
    }

    // ═══════════ CHART OF ACCOUNTS ═══════════

    /**
     * GET /api/accounting/coa
     */
    public function coaIndex(Request $request): JsonResponse
    {
        $query = ChartOfAccount::with('parent');

        if ($request->has('category'))
            $query->where('category', $request->category);
        if ($request->boolean('active_only', true))
            $query->where('is_active', true);

        return $this->success($query->orderBy('code')->get());
    }

    /**
     * POST /api/accounting/coa
     */
    public function coaStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|unique:chart_of_accounts,code',
            'name' => 'required|string|max:255',
            'category' => 'required|string|in:ASSET,LIABILITY,EQUITY,REVENUE,EXPENSE',
            'normal_balance' => 'required|string|in:DEBIT,CREDIT',
            'parent_id' => 'nullable|uuid|exists:chart_of_accounts,id',
            'report_section' => 'nullable|string',
            'is_cooperative_specific' => 'nullable|boolean',
        ]);

        $account = ChartOfAccount::create($validated);
        return $this->created($account, 'Akun berhasil ditambahkan');
    }

    // ═══════════ JOURNAL ENTRIES ═══════════

    /**
     * GET /api/accounting/journals
     */
    public function journalIndex(Request $request): JsonResponse
    {
        $query = JournalEntry::with('lines.account');

        if ($request->has('start_date'))
            $query->where('entry_date', '>=', $request->start_date);
        if ($request->has('end_date'))
            $query->where('entry_date', '<=', $request->end_date);
        if ($request->has('is_posted'))
            $query->where('is_posted', $request->boolean('is_posted'));

        $journals = $query->orderByDesc('entry_date')
            ->orderByDesc('created_at')
            ->paginate($request->per_page ?? 15);

        return $this->paginated($journals);
    }

    /**
     * POST /api/accounting/journals
     */
    public function journalStore(StoreJournalRequest $request): JsonResponse
    {
        try {
            $entry = $this->journalService->createJournal([
                ...$request->validated(),
                'created_by' => $request->user()->id,
            ]);

            return $this->created($entry->load('lines.account'), 'Jurnal berhasil dibuat');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * GET /api/accounting/journals/{id}
     */
    public function journalShow(string $id): JsonResponse
    {
        $entry = JournalEntry::with(['lines.account', 'creator', 'approver'])->findOrFail($id);
        return $this->success($entry);
    }

    /**
     * POST /api/accounting/journals/{id}/post
     */
    public function journalPost(string $id): JsonResponse
    {
        try {
            $entry = $this->journalService->postJournal($id);
            return $this->success($entry, 'Jurnal berhasil diposting');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /api/accounting/journals/{id}/reverse
     */
    public function journalReverse(Request $request, string $id): JsonResponse
    {
        try {
            $reversal = $this->journalService->reverseJournal($id, $request->input('reason'));
            return $this->success($reversal, 'Jurnal berhasil di-reverse');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    // ═══════════ LEDGER & REPORTS ═══════════

    /**
     * GET /api/accounting/ledger/{accountCode}
     */
    public function ledger(Request $request, string $accountCode): JsonResponse
    {
        return $this->success($this->journalService->getLedger(
            $accountCode,
            $request->start_date,
            $request->end_date
        ));
    }

    /**
     * GET /api/accounting/trial-balance
     */
    public function trialBalance(Request $request): JsonResponse
    {
        return $this->success($this->journalService->getTrialBalance($request->as_of_date));
    }

    /**
     * GET /api/accounting/reports/balance-sheet
     */
    public function balanceSheet(Request $request): JsonResponse
    {
        return $this->success($this->reportService->getBalanceSheet($request->as_of_date));
    }

    /**
     * GET /api/accounting/reports/income-statement
     */
    public function incomeStatement(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        return $this->success($this->reportService->getIncomeStatement(
            $request->start_date,
            $request->end_date
        ));
    }

    /**
     * GET /api/accounting/reports/cash-flow
     */
    public function cashFlow(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        return $this->success($this->reportService->getCashFlow(
            $request->start_date,
            $request->end_date
        ));
    }
}
