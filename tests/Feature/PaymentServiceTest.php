<?php

namespace Tests\Feature;

use App\Enums\MemberStatus;
use App\Enums\PaymentStatus;
use App\Enums\PaymentType;
use App\Enums\UserRole;
use App\Models\ChartOfAccount;
use App\Models\Member;
use App\Models\MemberEquity;
use App\Models\Payment;
use App\Models\User;
use App\Services\Payment\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PaymentServiceTest extends TestCase
{
    use RefreshDatabase;

    private PaymentService $service;
    private Member $member;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(PaymentService::class);
        $this->seedCOA();
        $this->user = User::factory()->create(['role' => UserRole::MEMBER]);
        $this->member = $this->createTestMember($this->user);
    }

    private function seedCOA(): void
    {
        ChartOfAccount::create(['code' => '1-1100', 'name' => 'Kas', 'category' => 'ASSET', 'normal_balance' => 'DEBIT']);
        ChartOfAccount::create(['code' => '2-1100', 'name' => 'Simpanan Sukarela', 'category' => 'LIABILITY', 'normal_balance' => 'CREDIT']);
        ChartOfAccount::create(['code' => '3-1100', 'name' => 'Simpanan Pokok', 'category' => 'EQUITY', 'normal_balance' => 'CREDIT']);
        ChartOfAccount::create(['code' => '3-1200', 'name' => 'Simpanan Wajib', 'category' => 'EQUITY', 'normal_balance' => 'CREDIT']);
    }

    private function createTestMember(User $user): Member
    {
        $member = Member::create([
            'user_id' => $user->id,
            'member_number' => 'M-TEST-001',
            'nik' => '3301010101010001',
            'name' => 'Test Member',
            'unit_kerja' => 'Test Unit',
            'email' => 'test@example.com',
            'phone' => '081234567890',
            'status' => MemberStatus::ACTIVE,
            'join_date' => '2026-01-01',
        ]);
        MemberEquity::create(['member_id' => $member->id]);
        return $member;
    }

    // ═══════════ QRIS Creation ═══════════

    public function test_create_qris_payment_calls_doku_and_stores_record(): void
    {
        // Mock DOKU API response
        Http::fake([
            '*/snap-adapter/b2b/v1.0/qr/qr-mpm-generate' => Http::response([
                'responseCode' => '2005500',
                'responseMessage' => 'Request has been processed successfully',
                'referenceNo' => 'DOKU-REF-123',
                'partnerReferenceNo' => 'KOP-20260217-ABCD1234',
                'qrContent' => '00020101021226680016COM.DOKU.WWW',
                'qrUrl' => 'https://api-sandbox.doku.com/qr/test-qr.png',
            ], 200),
        ]);

        $payment = $this->service->createQrisPayment([
            'member_id' => $this->member->id,
            'payment_type' => 'SIMPANAN_WAJIB',
            'amount' => 50000,
        ]);

        $this->assertNotNull($payment);
        $this->assertEquals(PaymentStatus::PENDING, $payment->status);
        $this->assertEquals(PaymentType::SIMPANAN_WAJIB, $payment->payment_type);
        $this->assertEquals(50000, $payment->amount);
        $this->assertNotEmpty($payment->midtrans_order_id);
        $this->assertNotEmpty($payment->qris_url);
        $this->assertNotNull($payment->expired_at);
    }

    public function test_create_qris_below_minimum_throws_exception(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Minimum pembayaran');

        $this->service->createQrisPayment([
            'member_id' => $this->member->id,
            'payment_type' => 'SIMPANAN_POKOK',
            'amount' => 500,
        ]);
    }

    public function test_create_angsuran_without_loan_id_throws_exception(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('loan_id wajib diisi');

        $this->service->createQrisPayment([
            'member_id' => $this->member->id,
            'payment_type' => 'ANGSURAN_PINJAMAN',
            'amount' => 500000,
        ]);
    }

    // ═══════════ Webhook ═══════════

    public function test_webhook_success_marks_payment_as_paid_and_creates_deposit(): void
    {
        // Create a pending payment manually
        $payment = Payment::create([
            'member_id' => $this->member->id,
            'payment_type' => PaymentType::SIMPANAN_WAJIB,
            'amount' => 50000,
            'status' => PaymentStatus::PENDING,
            'midtrans_order_id' => 'KOP-TEST-001',
            'midtrans_transaction_id' => 'DOKU-REF-123',
            'saving_type' => 'WAJIB',
            'expired_at' => now()->addMinutes(30),
        ]);

        // Build valid DOKU signature
        $secretKey = config('doku.secret_key');
        $timestamp = now()->toIso8601String();
        $requestTarget = '/api/payments/webhook';
        $body = [
            'partnerReferenceNo' => 'KOP-TEST-001',
            'referenceNo' => 'DOKU-REF-123',
            'status' => 'SUCCESS',
            'amount' => ['value' => '50000.00', 'currency' => 'IDR'],
        ];
        $minifiedBody = json_encode($body, JSON_UNESCAPED_SLASHES);
        $digest = strtolower(hash('sha256', $minifiedBody));
        $stringToSign = "POST:{$requestTarget}::{$digest}:{$timestamp}";
        $signature = base64_encode(hash_hmac('sha512', $stringToSign, $secretKey, true));

        $result = $this->service->handleWebhook([
            ...$body,
            '_signature' => $signature,
            '_timestamp' => $timestamp,
            '_request_target' => $requestTarget,
        ]);

        $this->assertEquals(PaymentStatus::PAID, $result->status);
        $this->assertNotNull($result->paid_at);

        // Check that a savings deposit was created
        $this->assertDatabaseHas('savings', [
            'member_id' => $this->member->id,
            'type' => 'WAJIB',
            'amount' => '50000.00',
        ]);
    }

    public function test_webhook_with_invalid_signature_throws_exception(): void
    {
        Payment::create([
            'member_id' => $this->member->id,
            'payment_type' => PaymentType::SIMPANAN_WAJIB,
            'amount' => 50000,
            'status' => PaymentStatus::PENDING,
            'midtrans_order_id' => 'KOP-TEST-002',
            'expired_at' => now()->addMinutes(30),
        ]);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid signature');

        $this->service->handleWebhook([
            'partnerReferenceNo' => 'KOP-TEST-002',
            'status' => 'SUCCESS',
            '_signature' => 'invalid-signature',
            '_timestamp' => now()->toIso8601String(),
            '_request_target' => '/api/payments/webhook',
        ]);
    }

    public function test_webhook_expired_marks_payment_as_expired(): void
    {
        Payment::create([
            'member_id' => $this->member->id,
            'payment_type' => PaymentType::SIMPANAN_POKOK,
            'amount' => 100000,
            'status' => PaymentStatus::PENDING,
            'midtrans_order_id' => 'KOP-TEST-003',
            'expired_at' => now()->addMinutes(30),
        ]);

        $secretKey = config('doku.secret_key');
        $timestamp = now()->toIso8601String();
        $requestTarget = '/api/payments/webhook';
        $body = [
            'partnerReferenceNo' => 'KOP-TEST-003',
            'status' => 'EXPIRED',
        ];
        $minifiedBody = json_encode($body, JSON_UNESCAPED_SLASHES);
        $digest = strtolower(hash('sha256', $minifiedBody));
        $stringToSign = "POST:{$requestTarget}::{$digest}:{$timestamp}";
        $signature = base64_encode(hash_hmac('sha512', $stringToSign, $secretKey, true));

        $result = $this->service->handleWebhook([
            ...$body,
            '_signature' => $signature,
            '_timestamp' => $timestamp,
            '_request_target' => $requestTarget,
        ]);

        $this->assertEquals(PaymentStatus::EXPIRED, $result->status);
    }

    // ═══════════ Status Check ═══════════

    public function test_check_status_returns_existing_status_if_already_paid(): void
    {
        $payment = Payment::create([
            'member_id' => $this->member->id,
            'payment_type' => PaymentType::SIMPANAN_WAJIB,
            'amount' => 50000,
            'status' => PaymentStatus::PAID,
            'midtrans_order_id' => 'KOP-TEST-004',
            'paid_at' => now(),
            'expired_at' => now()->addMinutes(30),
        ]);

        // Should NOT call DOKU API
        Http::fake();

        $result = $this->service->checkStatus($payment->id);
        $this->assertEquals(PaymentStatus::PAID, $result->status);

        Http::assertNothingSent();
    }

    // ═══════════ API Endpoints ═══════════

    public function test_payment_history_endpoint(): void
    {
        Payment::create([
            'member_id' => $this->member->id,
            'payment_type' => PaymentType::SIMPANAN_WAJIB,
            'amount' => 50000,
            'status' => PaymentStatus::PAID,
            'midtrans_order_id' => 'KOP-HIST-001',
            'paid_at' => now(),
            'expired_at' => now()->addMinutes(30),
        ]);

        $response = $this->actingAs($this->user)->getJson('/api/payments/history');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
    }
}
