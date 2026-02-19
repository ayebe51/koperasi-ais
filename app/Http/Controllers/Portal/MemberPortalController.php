<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MemberPortalController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/me/dashboard
     * Member's personal dashboard: savings summary + active loans overview
     */
    public function dashboard(Request $request): JsonResponse
    {
        $member = $request->user()->member;

        if (!$member) {
            return $this->error('Akun Anda belum terhubung ke data anggota', 404);
        }

        $pokok = $member->getSavingBalance('POKOK');
        $wajib = $member->getSavingBalance('WAJIB');
        $sukarela = $member->getSavingBalance('SUKARELA');

        $activeLoans = $member->loans()
            ->whereIn('status', ['ACTIVE', 'APPROVED', 'PENDING'])
            ->get()
            ->map(fn($loan) => [
                'id' => $loan->id,
                'loan_number' => $loan->loan_number,
                'principal_amount' => $loan->principal_amount,
                'monthly_payment' => $loan->monthly_payment,
                'outstanding_balance' => $loan->getOutstandingBalance(),
                'term_months' => $loan->term_months,
                'interest_rate' => $loan->interest_rate,
                'status' => $loan->status,
                'loan_date' => $loan->loan_date,
                'due_date' => $loan->due_date,
            ]);

        $recentSavings = $member->savings()
            ->orderByDesc('transaction_date')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get();

        return $this->success([
            'member' => [
                'id' => $member->id,
                'name' => $member->name,
                'member_number' => $member->member_number,
                'unit_kerja' => $member->unit_kerja,
                'join_date' => $member->join_date,
                'status' => $member->status,
            ],
            'savings' => [
                'pokok' => $pokok,
                'wajib' => $wajib,
                'sukarela' => $sukarela,
                'total' => $pokok + $wajib + $sukarela,
            ],
            'active_loans' => $activeLoans,
            'recent_savings' => $recentSavings,
        ]);
    }

    /**
     * GET /api/me/savings
     * Full savings transaction history for the logged-in member
     */
    public function savings(Request $request): JsonResponse
    {
        $member = $request->user()->member;

        if (!$member) {
            return $this->error('Akun Anda belum terhubung ke data anggota', 404);
        }

        $query = $member->savings()->orderByDesc('transaction_date')->orderByDesc('created_at');

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        $savings = $query->paginate($request->per_page ?? 15);

        return response()->json([
            'data' => $savings->items(),
            'meta' => [
                'current_page' => $savings->currentPage(),
                'last_page' => $savings->lastPage(),
                'per_page' => $savings->perPage(),
                'total' => $savings->total(),
            ],
        ]);
    }

    /**
     * GET /api/me/loans
     * All loans (with schedule) for the logged-in member
     */
    public function loans(Request $request): JsonResponse
    {
        $member = $request->user()->member;

        if (!$member) {
            return $this->error('Akun Anda belum terhubung ke data anggota', 404);
        }

        $loans = $member->loans()
            ->orderByDesc('loan_date')
            ->get()
            ->map(fn($loan) => [
                'id' => $loan->id,
                'loan_number' => $loan->loan_number,
                'principal_amount' => $loan->principal_amount,
                'interest_rate' => $loan->interest_rate,
                'term_months' => $loan->term_months,
                'monthly_payment' => $loan->monthly_payment,
                'outstanding_balance' => $loan->getOutstandingBalance(),
                'status' => $loan->status,
                'purpose' => $loan->purpose,
                'loan_date' => $loan->loan_date,
                'due_date' => $loan->due_date,
                'schedules' => $loan->schedules->map(fn($s) => [
                    'installment_number' => $s->installment_number,
                    'due_date' => $s->due_date,
                    'principal' => $s->principal_amount,
                    'interest' => $s->interest_amount,
                    'total' => $s->total_amount,
                    'is_paid' => $s->is_paid,
                ]),
                'total_paid' => $loan->payments->sum('amount'),
            ]);

        return $this->success($loans);
    }
}
