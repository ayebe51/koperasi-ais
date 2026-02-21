<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\LoanDocument;
use App\Services\Loan\LoanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MemberPortalController extends Controller
{
    use ApiResponse;

    public function __construct(
        private LoanService $loanService,
    ) {
    }

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

        // Get last 6 months statistics for charts
        $startDate = now()->subMonths(5)->startOfMonth();

        $savingsStats = $member->savings()
            ->selectRaw("TO_CHAR(transaction_date, 'YYYY-MM') as month, SUM(amount) as total")
            ->where('transaction_type', 'DEPOSIT')
            ->where('transaction_date', '>=', $startDate)
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->pluck('total', 'month');

        $loanPaymentsStats = \App\Models\LoanPayment::whereHas('loan', function ($q) use ($member) {
            $q->where('member_id', $member->id);
        })
            ->selectRaw("TO_CHAR(payment_date, 'YYYY-MM') as month, SUM(total_paid) as total")
            ->where('payment_date', '>=', $startDate)
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->pluck('total', 'month');

        $statistics = collect(range(0, 5))->map(function ($i) use ($savingsStats, $loanPaymentsStats) {
            $date = now()->subMonths(5 - $i);
            $monthKey = $date->format('Y-m');
            return [
                'month' => $date->translatedFormat('M Y'),
                'savings' => (float) ($savingsStats[$monthKey] ?? 0),
                'installments' => (float) ($loanPaymentsStats[$monthKey] ?? 0),
            ];
        })->values();

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
            'statistics' => $statistics,
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
                'total_paid' => $loan->payments->sum('total_paid'),
            ]);

        return $this->success($loans);
    }

    /**
     * POST /api/me/loans/apply
     * Self-service loan application from member portal
     */
    public function applyLoan(Request $request): JsonResponse
    {
        $member = $request->user()->member;

        if (!$member) {
            return $this->error('Akun Anda belum terhubung ke data anggota', 404);
        }

        $validated = $request->validate([
            'principal_amount' => 'required|numeric|min:100000',
            'term_months' => 'required|integer|min:1|max:120',
            'purpose' => 'nullable|string|max:500',
            'documents' => 'nullable|array|max:5',
            'documents.*' => 'file|mimes:pdf,jpg,jpeg,png|max:512',
            'document_types' => 'nullable|array|max:5',
            'document_types.*' => 'string|in:KTP,SLIP_GAJI,SURAT_PERMOHONAN,JAMINAN,LAINNYA',
        ], [
            'principal_amount.required' => 'Jumlah pinjaman wajib diisi',
            'principal_amount.min' => 'Jumlah pinjaman minimal Rp 100.000',
            'term_months.required' => 'Jangka waktu wajib diisi',
            'term_months.max' => 'Jangka waktu maksimal 120 bulan',
            'documents.max' => 'Maksimal 5 dokumen',
            'documents.*.max' => 'Ukuran file maksimal 500KB',
            'documents.*.mimes' => 'Format file harus PDF, JPG, atau PNG',
        ]);

        try {
            $loan = $this->loanService->applyLoan([
                'member_id' => $member->id,
                'principal_amount' => $validated['principal_amount'],
                'interest_rate' => 1.5,
                'term_months' => $validated['term_months'],
                'purpose' => $validated['purpose'] ?? null,
            ]);

            // Handle document uploads
            if ($request->hasFile('documents')) {
                $types = $validated['document_types'] ?? [];
                foreach ($request->file('documents') as $idx => $file) {
                    $path = $file->store("loan-documents/{$loan->id}", 'public');
                    LoanDocument::create([
                        'loan_id' => $loan->id,
                        'document_type' => $types[$idx] ?? 'LAINNYA',
                        'file_name' => $file->getClientOriginalName(),
                        'file_path' => $path,
                        'mime_type' => $file->getMimeType(),
                        'file_size' => $file->getSize(),
                    ]);
                }
            }

            return $this->created([
                'loan_number' => $loan->loan_number,
                'status' => $loan->status,
                'documents_count' => $loan->documents()->count(),
            ], 'Pengajuan pinjaman berhasil dikirim, menunggu persetujuan');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }
}
