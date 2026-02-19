<?php

namespace Tests\Feature\Api;

use App\Enums\MemberStatus;
use App\Enums\UserRole;
use App\Models\ChartOfAccount;
use App\Models\Member;
use App\Models\MemberEquity;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SavingApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Member $member;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => UserRole::ADMIN]);
        $this->seedCOA();
        $this->member = $this->createTestMember();
    }

    private function seedCOA(): void
    {
        ChartOfAccount::create(['code' => '1-1100', 'name' => 'Kas', 'category' => 'ASSET', 'normal_balance' => 'DEBIT']);
        ChartOfAccount::create(['code' => '2-1100', 'name' => 'Simpanan Sukarela', 'category' => 'LIABILITY', 'normal_balance' => 'CREDIT']);
        ChartOfAccount::create(['code' => '3-1100', 'name' => 'Simpanan Pokok', 'category' => 'EQUITY', 'normal_balance' => 'CREDIT']);
        ChartOfAccount::create(['code' => '3-1200', 'name' => 'Simpanan Wajib', 'category' => 'EQUITY', 'normal_balance' => 'CREDIT']);
    }

    private function createTestMember(): Member
    {
        $user = User::factory()->create(['role' => UserRole::MEMBER]);
        $member = Member::create([
            'user_id' => $user->id,
            'member_number' => 'M-TEST-001',
            'nik' => '3301010101010001',
            'name' => 'Test Member',
            'unit_kerja' => 'Test Unit',
            'status' => MemberStatus::ACTIVE,
            'join_date' => '2026-01-01',
        ]);
        MemberEquity::create(['member_id' => $member->id]);
        return $member;
    }

    // ═══════════ DEPOSIT ═══════════

    public function test_deposit_simpanan_pokok(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/savings/deposit', [
                'member_id' => $this->member->id,
                'type' => 'POKOK',
                'amount' => 100000,
            ]);

        $response->assertCreated()
            ->assertJson(['success' => true])
            ->assertJsonPath('data.type', 'POKOK')
            ->assertJsonPath('data.amount', 100000);
    }

    public function test_deposit_minimum_amount_validation(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/savings/deposit', [
                'member_id' => $this->member->id,
                'type' => 'POKOK',
                'amount' => 500, // below minimum 1000
            ]);

        $response->assertUnprocessable();
    }

    public function test_deposit_invalid_type_validation(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/savings/deposit', [
                'member_id' => $this->member->id,
                'type' => 'INVALID',
                'amount' => 50000,
            ]);

        $response->assertUnprocessable();
    }

    // ═══════════ WITHDRAW ═══════════

    public function test_withdraw_sukarela_after_deposit(): void
    {
        // First deposit
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/savings/deposit', [
                'member_id' => $this->member->id,
                'type' => 'SUKARELA',
                'amount' => 500000,
            ]);

        // Then withdraw
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/savings/withdraw', [
                'member_id' => $this->member->id,
                'type' => 'SUKARELA',
                'amount' => 200000,
            ]);

        $response->assertCreated()
            ->assertJson(['success' => true])
            ->assertJsonPath('data.balance', 300000);
    }

    public function test_withdraw_pokok_blocked(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/savings/withdraw', [
                'member_id' => $this->member->id,
                'type' => 'POKOK', // not allowed
                'amount' => 50000,
            ]);

        $response->assertUnprocessable();
    }

    // ═══════════ BALANCE ═══════════

    public function test_get_balance(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/savings/deposit', [
                'member_id' => $this->member->id,
                'type' => 'POKOK',
                'amount' => 100000,
            ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/savings/balance/{$this->member->id}");

        $response->assertOk()
            ->assertJsonPath('data.simpanan_pokok', 100000)
            ->assertJsonStructure(['data' => ['simpanan_pokok', 'simpanan_wajib', 'simpanan_sukarela', 'total']]);
    }

    // ═══════════ INDEX ═══════════

    public function test_list_savings_with_filter(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/savings/deposit', [
                'member_id' => $this->member->id,
                'type' => 'POKOK',
                'amount' => 100000,
            ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/savings?member_id={$this->member->id}&type=POKOK");

        $response->assertOk()
            ->assertJsonCount(1, 'data');
    }
}
