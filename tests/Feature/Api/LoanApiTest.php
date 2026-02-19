<?php

namespace Tests\Feature\Api;

use App\Enums\LoanStatus;
use App\Enums\MemberStatus;
use App\Enums\UserRole;
use App\Models\ChartOfAccount;
use App\Models\Member;
use App\Models\MemberEquity;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoanApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $manager;
    private Member $member;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => UserRole::ADMIN]);
        $this->manager = User::factory()->create(['role' => UserRole::MANAGER]);
        $this->seedCOA();
        $this->member = $this->createTestMember();
    }

    private function seedCOA(): void
    {
        ChartOfAccount::create(['code' => '1-1100', 'name' => 'Kas', 'category' => 'ASSET', 'normal_balance' => 'DEBIT']);
        ChartOfAccount::create(['code' => '1-1200', 'name' => 'Piutang Pinjaman', 'category' => 'ASSET', 'normal_balance' => 'DEBIT']);
        ChartOfAccount::create(['code' => '4-1100', 'name' => 'Pendapatan Bunga', 'category' => 'REVENUE', 'normal_balance' => 'CREDIT']);
        ChartOfAccount::create(['code' => '4-1200', 'name' => 'Pendapatan Admin', 'category' => 'REVENUE', 'normal_balance' => 'CREDIT']);
    }

    private function createTestMember(): Member
    {
        $member = Member::create([
            'member_number' => 'M-LOAN-001',
            'nik' => '3301020202020002',
            'name' => 'Peminjam Test',
            'unit_kerja' => 'Test Unit',
            'status' => MemberStatus::ACTIVE,
            'join_date' => '2026-01-01',
        ]);
        MemberEquity::create(['member_id' => $member->id]);
        return $member;
    }

    // ═══════════ APPLY ═══════════

    public function test_apply_loan(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/loans/apply', [
                'member_id' => $this->member->id,
                'principal_amount' => 5000000,
                'interest_rate' => 12,
                'term_months' => 12,
            ]);

        $response->assertCreated()
            ->assertJson(['success' => true])
            ->assertJsonPath('data.principal_amount', 5000000);

        $this->assertDatabaseHas('loans', [
            'member_id' => $this->member->id,
            'status' => LoanStatus::PENDING->value,
        ]);
    }

    public function test_apply_loan_minimum_amount(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/loans/apply', [
                'member_id' => $this->member->id,
                'principal_amount' => 50000, // below 100k
                'interest_rate' => 12,
                'term_months' => 12,
            ]);

        $response->assertUnprocessable();
    }

    // ═══════════ SIMULATE ═══════════

    public function test_simulate_loan(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/loans/simulate', [
                'principal_amount' => 10000000,
                'interest_rate' => 12,
                'term_months' => 24,
            ]);

        $response->assertOk()
            ->assertJson(['success' => true])
            ->assertJsonStructure([
                'data' => ['monthly_payment', 'total_payment', 'total_interest', 'effective_interest_rate'],
            ]);
    }

    // ═══════════ INDEX ═══════════

    public function test_list_loans(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/loans/apply', [
                'member_id' => $this->member->id,
                'principal_amount' => 1000000,
                'interest_rate' => 12,
                'term_months' => 6,
            ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/loans');

        $response->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_filter_loans_by_status(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/loans/apply', [
                'member_id' => $this->member->id,
                'principal_amount' => 1000000,
                'interest_rate' => 12,
                'term_months' => 6,
            ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/loans?status=PENDING');

        $response->assertOk()
            ->assertJsonCount(1, 'data');

        $response2 = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/loans?status=ACTIVE');

        $response2->assertOk()
            ->assertJsonCount(0, 'data');
    }

    // ═══════════ REJECT ═══════════

    public function test_reject_pending_loan(): void
    {
        $applyResponse = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/loans/apply', [
                'member_id' => $this->member->id,
                'principal_amount' => 1000000,
                'interest_rate' => 12,
                'term_months' => 6,
            ]);

        $loanId = $applyResponse->json('data.id');

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/loans/{$loanId}/reject");

        $response->assertOk()
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('loans', ['id' => $loanId, 'status' => 'REJECTED']);
    }

    // ═══════════ RBAC ═══════════

    public function test_accountant_cannot_apply_loan(): void
    {
        $accountant = User::factory()->create(['role' => UserRole::ACCOUNTANT]);

        $response = $this->actingAs($accountant, 'sanctum')
            ->postJson('/api/loans/apply', [
                'member_id' => $this->member->id,
                'principal_amount' => 1000000,
                'interest_rate' => 12,
                'term_months' => 6,
            ]);

        $response->assertForbidden();
    }
}
