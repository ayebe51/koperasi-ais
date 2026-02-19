<?php

namespace App\Http\Controllers\Loan;

use App\Http\Controllers\Controller;
use App\Http\Requests\Loan\ApplyLoanRequest;
use App\Http\Requests\Loan\SimulateLoanRequest;
use App\Http\Resources\LoanResource;
use App\Http\Traits\ApiResponse;
use App\Models\Loan;
use App\Services\Loan\AmortizationEngine;
use App\Services\Loan\CKPNService;
use App\Services\Loan\InterestEngine;
use App\Services\Loan\LoanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LoanController extends Controller
{
    use ApiResponse;

    public function __construct(
        private LoanService $loanService,
        private InterestEngine $interestEngine,
        private AmortizationEngine $amortizationEngine,
        private CKPNService $ckpnService
    ) {
    }

    /**
     * GET /api/loans
     */
    public function index(Request $request): JsonResponse
    {
        $query = Loan::with('member');

        if ($request->has('member_id'))
            $query->where('member_id', $request->member_id);
        if ($request->has('status'))
            $query->where('status', $request->status);
        if ($request->has('collectibility'))
            $query->where('collectibility', $request->collectibility);

        $loans = $query->orderByDesc('created_at')->paginate($request->per_page ?? 15);

        return LoanResource::collection($loans)->response();
    }

    /**
     * POST /api/loans/apply
     */
    public function apply(ApplyLoanRequest $request): JsonResponse
    {
        try {
            $loan = $this->loanService->applyLoan($request->validated());
            return $this->created(new LoanResource($loan->load('member')), 'Pengajuan pinjaman berhasil');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /api/loans/{id}/approve
     */
    public function approve(Request $request, string $id): JsonResponse
    {
        try {
            $loan = $this->loanService->approveLoan($id, $request->user()->id);
            return $this->success(new LoanResource($loan), 'Pinjaman disetujui dan jadwal angsuran dibuat');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /api/loans/{id}/reject
     */
    public function reject(string $id): JsonResponse
    {
        $loan = Loan::findOrFail($id);

        if ($loan->status->value !== 'PENDING') {
            return $this->error('Hanya pinjaman PENDING yang bisa ditolak', 422);
        }

        $loan->update(['status' => 'REJECTED']);
        return $this->success(new LoanResource($loan), 'Pinjaman ditolak');
    }

    /**
     * POST /api/loans/{id}/pay
     */
    public function pay(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'payment_date' => 'nullable|date',
            'payment_method' => 'nullable|string|in:CASH,TRANSFER,QRIS',
        ]);

        try {
            $payment = $this->loanService->processPayment($id, [
                ...$validated,
                'created_by' => $request->user()->id,
            ]);

            return $this->success($payment, 'Pembayaran angsuran berhasil');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * GET /api/loans/{id}
     */
    public function show(string $id): JsonResponse
    {
        $loan = Loan::with(['member', 'schedules', 'payments', 'ckpnProvisions'])->findOrFail($id);

        return $this->success([
            'loan' => new LoanResource($loan),
            'outstanding_balance' => $loan->getOutstandingBalance(),
            'overdue_days' => $loan->getOverdueDays(),
        ]);
    }

    /**
     * GET /api/loans/{id}/schedule
     */
    public function schedule(string $id): JsonResponse
    {
        $loan = Loan::with('schedules')->findOrFail($id);

        return $this->success([
            'schedule' => $loan->schedules,
            'paid_count' => $loan->schedules->where('is_paid', true)->count(),
            'remaining_count' => $loan->schedules->where('is_paid', false)->count(),
        ]);
    }

    /**
     * POST /api/loans/simulate
     */
    public function simulate(SimulateLoanRequest $request): JsonResponse
    {
        $summary = $this->amortizationEngine->getSummary(
            (float) $request->principal_amount,
            (float) $request->interest_rate,
            (int) $request->term_months,
            now()->toDateString()
        );

        $eir = $this->interestEngine->calculateEIR(
            (float) $request->principal_amount,
            (float) $request->interest_rate,
            (float) ($request->fees ?? 0),
            (int) $request->term_months
        );

        return $this->success([
            ...$summary,
            'effective_interest_rate' => round($eir * 100, 4) . '%',
        ]);
    }

    /**
     * POST /api/loans/ckpn
     */
    public function runCKPN(Request $request): JsonResponse
    {
        $request->validate(['period' => 'required|date']);

        try {
            $result = $this->ckpnService->runMonthlyProvision($request->period);
            return $this->success($result, 'Perhitungan CKPN berhasil');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }
}
