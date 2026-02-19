<?php

namespace App\Services\Payment;

use App\Enums\PaymentStatus;
use App\Enums\PaymentType;
use App\Models\Loan;
use App\Models\Member;
use App\Models\Payment;
use App\Services\Loan\LoanService;
use App\Services\Saving\SavingService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use InvalidArgumentException;

class PaymentService
{
    private string $clientId;
    private string $secretKey;
    private string $baseUrl;

    public function __construct(
        private SavingService $savingService,
        private LoanService $loanService,
    ) {
        $this->clientId = config('doku.client_id');
        $this->secretKey = config('doku.secret_key');
        $this->baseUrl = config('doku.is_production')
            ? 'https://api.doku.com'
            : 'https://api-sandbox.doku.com';
    }

    /**
     * Create a QRIS payment via DOKU API
     */
    public function createQrisPayment(array $data): Payment
    {
        $member = Member::findOrFail($data['member_id']);
        $paymentType = PaymentType::from($data['payment_type']);
        $amount = (int) $data['amount'];

        if ($amount < 1000) {
            throw new InvalidArgumentException('Minimum pembayaran QRIS adalah Rp 1.000');
        }

        // Validate loan for installment payments
        $loanId = null;
        if ($paymentType === PaymentType::ANGSURAN_PINJAMAN) {
            if (empty($data['loan_id'])) {
                throw new InvalidArgumentException('loan_id wajib diisi untuk pembayaran angsuran');
            }
            $loan = Loan::where('id', $data['loan_id'])
                ->where('member_id', $member->id)
                ->firstOrFail();
            $loanId = $loan->id;
        }

        $orderId = 'KOP-' . now()->format('Ymd') . '-' . strtoupper(Str::random(8));
        $expiryMinutes = config('doku.qris_expiry_minutes', 30);

        // ── Build DOKU request ──
        $requestTarget = '/snap-adapter/b2b/v1.0/qr/qr-mpm-generate';
        $timestamp = now()->toIso8601String();
        $externalId = strtoupper(Str::random(16));

        $requestBody = [
            'partnerReferenceNo' => $orderId,
            'amount' => [
                'value' => number_format($amount, 2, '.', ''),
                'currency' => 'IDR',
            ],
            'merchantId' => $this->clientId,
            'validityPeriod' => now()->addMinutes($expiryMinutes)->toIso8601String(),
            'additionalInfo' => [
                'paymentType' => $paymentType->label(),
                'memberName' => $member->name,
            ],
        ];

        // Generate DOKU signature
        // DOKU SNAP: HMAC_SHA512(clientSecret, StringToSign)
        // StringToSign = HTTPMethod + ":" + RequestTarget + ":" + AccessToken + ":" + LowerCase(HexEncode(SHA-256(MinifiedBody))) + ":" + Timestamp
        $minifiedBody = json_encode($requestBody, JSON_UNESCAPED_SLASHES);
        $digest = strtolower(hash('sha256', $minifiedBody));
        $stringToSign = "POST:{$requestTarget}::{$digest}:{$timestamp}";
        $signature = base64_encode(hash_hmac('sha512', $stringToSign, $this->secretKey, true));

        $response = Http::withHeaders([
            'X-PARTNER-ID' => $this->clientId,
            'X-EXTERNAL-ID' => $externalId,
            'X-TIMESTAMP' => $timestamp,
            'X-SIGNATURE' => $signature,
            'Content-Type' => 'application/json',
        ])->post("{$this->baseUrl}{$requestTarget}", $requestBody);

        if (!$response->successful()) {
            Log::error('DOKU QRIS charge failed', [
                'status' => $response->status(),
                'body' => $response->json(),
            ]);
            throw new \RuntimeException(
                'Gagal membuat pembayaran QRIS: ' . ($response->json('responseMessage') ?? 'Unknown error')
            );
        }

        $dokuData = $response->json();

        // Extract QR data from DOKU response
        $qrisUrl = $dokuData['qrUrl'] ?? '';
        $qrisString = $dokuData['qrContent'] ?? '';
        $referenceNo = $dokuData['referenceNo'] ?? '';

        // Create payment record
        $payment = Payment::create([
            'member_id' => $member->id,
            'payment_type' => $paymentType,
            'amount' => $amount,
            'status' => PaymentStatus::PENDING,
            'midtrans_order_id' => $orderId,  // reusing column for order_id
            'midtrans_transaction_id' => $referenceNo,  // reusing column for DOKU reference
            'qris_url' => $qrisUrl,
            'qris_string' => $qrisString,
            'loan_id' => $loanId,
            'saving_type' => $paymentType->toSavingType(),
            'expired_at' => now()->addMinutes($expiryMinutes),
            'metadata' => [
                'doku_response' => $dokuData,
                'external_id' => $externalId,
            ],
        ]);

        return $payment->load('member');
    }

    /**
     * Handle DOKU webhook/notification
     *
     * DOKU sends HTTP notification to your configured callback URL.
     * Signature format: HMAC_SHA512(clientSecret, StringToSign)
     */
    public function handleWebhook(array $notification): Payment
    {
        // Verify DOKU signature from headers (passed via controller)
        $signatureHeader = $notification['_signature'] ?? '';
        $timestampHeader = $notification['_timestamp'] ?? '';
        $requestTarget = $notification['_request_target'] ?? '/api/payments/webhook';

        // Rebuild signature to verify
        $bodyWithoutMeta = collect($notification)->except(['_signature', '_timestamp', '_request_target'])->toArray();
        $minifiedBody = json_encode($bodyWithoutMeta, JSON_UNESCAPED_SLASHES);
        $digest = strtolower(hash('sha256', $minifiedBody));
        $stringToSign = "POST:{$requestTarget}::{$digest}:{$timestampHeader}";
        $expectedSignature = base64_encode(hash_hmac('sha512', $stringToSign, $this->secretKey, true));

        if (!hash_equals($expectedSignature, $signatureHeader)) {
            Log::warning('DOKU webhook: invalid signature', [
                'order_id' => $notification['partnerReferenceNo'] ?? 'unknown',
            ]);
            throw new InvalidArgumentException('Invalid signature');
        }

        $orderId = $notification['partnerReferenceNo'] ?? '';
        $payment = Payment::where('midtrans_order_id', $orderId)->firstOrFail();

        $transactionStatus = $notification['status'] ?? $notification['result']['status'] ?? '';
        $referenceNo = $notification['referenceNo'] ?? '';

        Log::info('DOKU webhook received', [
            'order_id' => $orderId,
            'status' => $transactionStatus,
            'reference_no' => $referenceNo,
        ]);

        // Update reference if not set
        if (empty($payment->midtrans_transaction_id) && $referenceNo) {
            $payment->update(['midtrans_transaction_id' => $referenceNo]);
        }

        // Process based on status
        $statusUpper = strtoupper($transactionStatus);
        if (in_array($statusUpper, ['SUCCESS', 'PAID', 'SETTLEMENT', '00'])) {
            if ($payment->isPending()) {
                $this->processSuccessfulPayment($payment);
            }
        } elseif (in_array($statusUpper, ['FAILED', 'DENIED', 'CANCEL'])) {
            $payment->update(['status' => PaymentStatus::FAILED]);
        } elseif (in_array($statusUpper, ['EXPIRED', 'EXPIRE'])) {
            $payment->update(['status' => PaymentStatus::EXPIRED]);
        }

        return $payment->fresh();
    }

    /**
     * Check payment status from DOKU
     */
    public function checkStatus(string $paymentId): Payment
    {
        $payment = Payment::findOrFail($paymentId);

        // If already settled, no need to check
        if ($payment->status !== PaymentStatus::PENDING) {
            return $payment;
        }

        // Check if expired locally
        if ($payment->isExpired()) {
            $payment->update(['status' => PaymentStatus::EXPIRED]);
            return $payment->fresh();
        }

        // Poll DOKU for status
        $requestTarget = '/snap-adapter/b2b/v1.0/qr/qr-mpm-query';
        $timestamp = now()->toIso8601String();
        $externalId = strtoupper(Str::random(16));

        $requestBody = [
            'originalPartnerReferenceNo' => $payment->midtrans_order_id,
            'originalReferenceNo' => $payment->midtrans_transaction_id ?? '',
            'serviceCode' => '47',
        ];

        $minifiedBody = json_encode($requestBody, JSON_UNESCAPED_SLASHES);
        $digest = strtolower(hash('sha256', $minifiedBody));
        $stringToSign = "POST:{$requestTarget}::{$digest}:{$timestamp}";
        $signature = base64_encode(hash_hmac('sha512', $stringToSign, $this->secretKey, true));

        $response = Http::withHeaders([
            'X-PARTNER-ID' => $this->clientId,
            'X-EXTERNAL-ID' => $externalId,
            'X-TIMESTAMP' => $timestamp,
            'X-SIGNATURE' => $signature,
            'Content-Type' => 'application/json',
        ])->post("{$this->baseUrl}{$requestTarget}", $requestBody);

        if ($response->successful()) {
            $statusData = $response->json();
            $latestStatus = strtoupper($statusData['latestTransactionStatus'] ?? $statusData['transactionStatusDesc'] ?? '');

            if (in_array($latestStatus, ['SUCCESS', 'PAID', '00'])) {
                $this->processSuccessfulPayment($payment);
            } elseif (in_array($latestStatus, ['EXPIRED', 'EXPIRE'])) {
                $payment->update(['status' => PaymentStatus::EXPIRED]);
            } elseif (in_array($latestStatus, ['FAILED', 'DENIED'])) {
                $payment->update(['status' => PaymentStatus::FAILED]);
            }
        }

        return $payment->fresh();
    }

    /**
     * Process a successful payment: create savings deposit or loan payment
     */
    private function processSuccessfulPayment(Payment $payment): void
    {
        DB::transaction(function () use ($payment) {
            $payment->update([
                'status' => PaymentStatus::PAID,
                'paid_at' => now(),
            ]);

            $member = $payment->member;
            $paymentType = $payment->payment_type;

            if ($paymentType === PaymentType::ANGSURAN_PINJAMAN) {
                // Process loan installment payment
                $loanPayment = $this->loanService->processPayment($payment->loan_id, [
                    'payment_date' => now()->toDateString(),
                    'payment_method' => 'QRIS',
                    'created_by' => null,
                ]);

                Log::info('QRIS loan payment processed', [
                    'payment_id' => $payment->id,
                    'loan_payment_id' => $loanPayment->id,
                ]);
            } else {
                // Process savings deposit
                $savingType = $paymentType->toSavingType();
                $saving = $this->savingService->deposit([
                    'member_id' => $member->id,
                    'type' => $savingType,
                    'amount' => $payment->amount,
                    'date' => now()->toDateString(),
                    'description' => "Pembayaran via QRIS - {$payment->midtrans_order_id}",
                    'reference_number' => $payment->midtrans_order_id,
                ]);

                Log::info('QRIS saving deposit processed', [
                    'payment_id' => $payment->id,
                    'saving_id' => $saving->id,
                ]);
            }
        });
    }
}
