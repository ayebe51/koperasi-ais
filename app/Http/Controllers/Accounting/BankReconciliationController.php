<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\BankMutation;
use App\Models\LoanPayment;
use App\Models\Saving;
use App\Services\Accounting\BankStatementParser;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BankReconciliationController extends Controller
{
    use ApiResponse;

    protected $parser;

    public function __construct(BankStatementParser $parser)
    {
        $this->parser = $parser;
    }

    /**
     * Upload and preview bank statement
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt',
            'bank_type' => 'required|string',
        ]);

        $content = file_get_contents($request->file('file')->getRealPath());
        $mutations = $this->parser->parse($content, $request->bank_type);

        $savedCount = 0;
        $duplicates = 0;

        foreach ($mutations as $data) {
            // Check for duplicates based on reference_id
            if ($data['reference_id'] && BankMutation::where('reference_id', $data['reference_id'])->exists()) {
                $duplicates++;
                continue;
            }

            BankMutation::create($data);
            $savedCount++;
        }

        return $this->success([
            'saved' => $savedCount,
            'duplicates' => $duplicates,
            'total_parsed' => $mutations->count(),
        ], "Berhasil mengimpor $savedCount mutasi bank.");
    }

    /**
     * List all mutations with suggestions
     */
    public function index(Request $request): JsonResponse
    {
        $status = $request->get('status', 'PENDING');
        $mutations = BankMutation::where('status', $status)
            ->orderByDesc('transaction_date')
            ->paginate(20);

        // Enhance with suggestions
        $mutations->getCollection()->transform(function ($m) {
            $m->suggestions = $this->findSuggestions($m);
            return $m;
        });

        return $this->paginated($mutations);
    }

    /**
     * Find potential internal matches for a bank mutation
     */
    private function findSuggestions(BankMutation $mutation): array
    {
        $suggestions = [];
        $amount = (float) $mutation->amount;
        $date = $mutation->transaction_date;

        if ($mutation->type === 'CREDIT') {
            // Suggest Loan Payments
            // Look for payments with same amount in +/- 3 days
            $txDate = Carbon::parse($mutation->transaction_date);
            $payments = LoanPayment::with('loan.member')
                ->where('amount', $amount)
                ->whereBetween('payment_date', [
                    $txDate->copy()->subDays(3)->toDateString(),
                    $txDate->copy()->addDays(3)->toDateString()
                ])
                ->get();

            foreach ($payments as $p) {
                $pDate = Carbon::parse($p->payment_date);
                $suggestions[] = [
                    'type' => 'loan_payment',
                    'id' => $p->id,
                    'label' => "Angsuran Pinjaman: {$p->loan->loan_number} - {$p->loan->member->name}",
                    'confidence' => ($pDate->toDateString() === $txDate->toDateString() ? 'HIGH' : 'MEDIUM')
                ];
            }

            // Suggest Savings (maybe search description for member name/number)
            // This is more complex, but let's do a simple check
            // For now, allow manual search in UI
        }

        return $suggestions;
    }

    /**
     * Confirm reconciliation
     */
    public function reconcile(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'to_type' => 'required|string', // 'loan_payment', 'saving', 'other'
            'to_id' => 'nullable|integer',
            'action' => 'required|string', // 'confirm', 'ignore'
        ]);

        $mutation = BankMutation::findOrFail($id);

        if ($request->action === 'ignore') {
            $mutation->update(['status' => 'IGNORED']);
            return $this->success(null, 'Mutasi diabaikan.');
        }

        DB::transaction(function () use ($mutation, $request) {
            // Mark as reconciled
            $mutation->update([
                'status' => 'RECONCILED',
                'reconciled_to_type' => $request->to_type,
                'reconciled_to_id' => $request->to_id,
            ]);

            // Here we could also trigger automated journal creation or update
            // the status of the target record if it wasn't already paid.
            // But since this is semi-auto, the user might be matching a bank
            // record with a payment that was ALREADY recorded manually.
        });

        return $this->success($mutation, 'Rekonsiliasi berhasil dikonfirmasi.');
    }
}
