<?php

namespace App\Http\Controllers\Payment;

use App\Http\Controllers\Controller;
use App\Http\Requests\Payment\CreatePaymentRequest;
use App\Http\Traits\ApiResponse;
use App\Models\Payment;
use App\Services\Payment\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class PaymentController extends Controller
{
    use ApiResponse;

    public function __construct(
        private PaymentService $paymentService,
    ) {
    }

    /**
     * POST /api/payments/qris
     * Create a QRIS payment and return QR code
     */
    public function createQris(CreatePaymentRequest $request): JsonResponse
    {
        try {
            $user = $request->user();
            $member = $user->member;

            if (!$member) {
                return $this->error('Akun Anda tidak terhubung dengan data anggota', 403);
            }

            $payment = $this->paymentService->createQrisPayment([
                'member_id' => $member->id,
                'payment_type' => $request->payment_type,
                'amount' => $request->amount,
                'loan_id' => $request->loan_id,
            ]);

            return $this->created([
                'payment_id' => $payment->id,
                'order_id' => $payment->midtrans_order_id,
                'amount' => $payment->amount,
                'qris_url' => $payment->qris_url,
                'qris_string' => $payment->qris_string,
                'expired_at' => $payment->expired_at?->toIso8601String(),
                'status' => $payment->status->value,
            ], 'QRIS berhasil dibuat, silakan scan untuk membayar');
        } catch (\Exception $e) {
            Log::error('Create QRIS payment failed', ['error' => $e->getMessage()]);
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * GET /api/payments/{id}/status
     * Check payment status (for frontend polling)
     */
    public function checkStatus(string $id): JsonResponse
    {
        try {
            $payment = $this->paymentService->checkStatus($id);

            return $this->success([
                'payment_id' => $payment->id,
                'order_id' => $payment->midtrans_order_id,
                'status' => $payment->status->value,
                'paid_at' => $payment->paid_at?->toIso8601String(),
                'amount' => $payment->amount,
                'payment_type' => $payment->payment_type->value,
            ]);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * GET /api/payments/history
     * List payment history for the authenticated member
     */
    public function history(Request $request): JsonResponse
    {
        $user = $request->user();
        $member = $user->member;

        if (!$member) {
            return $this->error('Akun Anda tidak terhubung dengan data anggota', 403);
        }

        $query = Payment::where('member_id', $member->id);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        if ($request->has('payment_type')) {
            $query->where('payment_type', $request->payment_type);
        }

        $payments = $query->orderByDesc('created_at')
            ->paginate($request->per_page ?? 15);

        return response()->json([
            'success' => true,
            'data' => $payments->items(),
            'meta' => [
                'current_page' => $payments->currentPage(),
                'per_page' => $payments->perPage(),
                'total' => $payments->total(),
                'last_page' => $payments->lastPage(),
            ],
        ]);
    }

    /**
     * POST /api/payments/webhook
     * Handle DOKU webhook notification (public endpoint)
     */
    public function webhook(Request $request): JsonResponse
    {
        try {
            $notification = $request->all();

            // Pass DOKU auth headers for signature verification
            $notification['_signature'] = $request->header('X-SIGNATURE', '');
            $notification['_timestamp'] = $request->header('X-TIMESTAMP', '');
            $notification['_request_target'] = $request->getPathInfo();

            Log::info('DOKU webhook incoming', [
                'order_id' => $notification['partnerReferenceNo'] ?? 'unknown',
            ]);

            $payment = $this->paymentService->handleWebhook($notification);

            return response()->json([
                'responseCode' => '2005500',
                'responseMessage' => 'Request has been processed successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('DOKU webhook error', ['error' => $e->getMessage()]);
            return response()->json([
                'responseCode' => '5005500',
                'responseMessage' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * POST /api/payments/manual
     * Upload manual payment proof
     */
    public function submitManualPayment(Request $request): JsonResponse
    {
        $request->validate([
            'payment_type' => 'required|string',
            'amount' => 'required|numeric|min:1000',
            'loan_id' => 'nullable|uuid',
            'payment_method' => 'required|string|in:TRANSFER,QRIS',
            'proof_image' => 'required|image|max:2048', // max 2MB
            'notes' => 'nullable|string|max:255',
        ]);

        try {
            $user = $request->user();
            $member = $user->member;

            if (!$member) {
                return $this->error('Akun Anda tidak terhubung dengan data anggota', 403);
            }

            // Upload the proof image
            $path = $request->file('proof_image')->store('payment-proofs', 'public');

            $payment = $this->paymentService->createManualPayment([
                'member_id' => $member->id,
                'payment_type' => $request->payment_type,
                'amount' => $request->amount,
                'loan_id' => $request->loan_id,
                'payment_method' => $request->payment_method,
                'proof_file' => $path,
                'notes' => $request->notes,
            ]);

            return $this->created([
                'payment_id' => $payment->id,
                'order_id' => $payment->midtrans_order_id,
                'amount' => $payment->amount,
                'status' => $payment->status->value,
            ], 'Bukti pembayaran berhasil diunggah dan sedang diproses admin');
        } catch (\Exception $e) {
            Log::error('Upload manual payment failed', ['error' => $e->getMessage()]);
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * GET /api/payments/verifications
     * List manual payments waiting for admin approval
     */
    public function listManualVerifications(Request $request): JsonResponse
    {
        $query = Payment::with('member')
            ->where('midtrans_order_id', 'like', 'MAN-%')
            ->where('status', 'PENDING');

        if ($request->has('search')) {
            $s = $request->search;
            $query->whereHas('member', function ($q) use ($s) {
                $q->where('name', 'like', "%$s%")
                    ->orWhere('member_number', 'like', "%$s%");
            });
        }

        $payments = $query->orderByDesc('created_at')->paginate($request->per_page ?? 15);

        return response()->json([
            'success' => true,
            'data' => $payments->items(),
            'meta' => [
                'current_page' => $payments->currentPage(),
                'per_page' => $payments->perPage(),
                'total' => $payments->total(),
                'last_page' => $payments->lastPage(),
            ],
        ]);
    }

    /**
     * POST /api/payments/{id}/approve-manual
     */
    public function approveManual(Request $request, string $id): JsonResponse
    {
        try {
            $payment = $this->paymentService->approveManualPayment($id, $request->user()->id);
            return $this->success([
                'payment_id' => $payment->id,
                'status' => $payment->status->value,
            ], 'Pembayaran disetujui, bukti transaksi sah dan tercatat');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /api/payments/{id}/reject-manual
     */
    public function rejectManual(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'reason' => 'required|string|max:255',
        ]);
        try {
            $payment = $this->paymentService->rejectManualPayment($id, $request->reason, $request->user()->id);
            return $this->success([
                'payment_id' => $payment->id,
                'status' => $payment->status->value,
            ], 'Pembayaran ditolak: ' . $request->reason);
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }
}
