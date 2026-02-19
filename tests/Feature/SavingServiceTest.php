<?php

namespace Tests\Feature;

use App\Enums\MemberStatus;
use App\Enums\UserRole;
use App\Models\ChartOfAccount;
use App\Models\Member;
use App\Models\MemberEquity;
use App\Models\User;
use App\Services\Saving\SavingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SavingServiceTest extends TestCase
{
    use RefreshDatabase;

    private SavingService $service;
    private Member $member;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(SavingService::class);
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

    // ═══════════ Deposits ═══════════

    public function test_deposit_simpanan_pokok(): void
    {
        $saving = $this->service->deposit([
            'member_id' => $this->member->id,
            'type' => 'POKOK',
            'amount' => 100000,
        ]);

        $this->assertNotNull($saving);
        $this->assertEquals('POKOK', $saving->type->value);
        $this->assertEquals(100000, $saving->amount);
        $this->assertEquals('DEPOSIT', $saving->transaction_type->value);
    }

    public function test_deposit_simpanan_wajib(): void
    {
        $saving = $this->service->deposit([
            'member_id' => $this->member->id,
            'type' => 'WAJIB',
            'amount' => 50000,
        ]);

        $this->assertNotNull($saving);
        $this->assertEquals('WAJIB', $saving->type->value);
    }

    public function test_deposit_simpanan_sukarela(): void
    {
        $saving = $this->service->deposit([
            'member_id' => $this->member->id,
            'type' => 'SUKARELA',
            'amount' => 500000,
        ]);

        $this->assertNotNull($saving);
        $this->assertEquals('SUKARELA', $saving->type->value);
    }

    public function test_deposit_updates_member_equity_for_pokok(): void
    {
        $this->service->deposit([
            'member_id' => $this->member->id,
            'type' => 'POKOK',
            'amount' => 100000,
        ]);

        $equity = $this->member->equity->fresh();
        $this->assertEquals(100000, $equity->simpanan_pokok);
    }

    public function test_multiple_deposits_accumulate(): void
    {
        $this->service->deposit([
            'member_id' => $this->member->id,
            'type' => 'WAJIB',
            'amount' => 50000,
        ]);

        $saving2 = $this->service->deposit([
            'member_id' => $this->member->id,
            'type' => 'WAJIB',
            'amount' => 50000,
        ]);

        // The second deposit record should have the accumulated balance
        $this->assertEquals(100000, $saving2->balance);
    }

    // ═══════════ Withdrawals ═══════════

    public function test_withdraw_sukarela(): void
    {
        // First deposit
        $this->service->deposit([
            'member_id' => $this->member->id,
            'type' => 'SUKARELA',
            'amount' => 500000,
        ]);

        // Then withdraw
        $saving = $this->service->withdraw([
            'member_id' => $this->member->id,
            'type' => 'SUKARELA',
            'amount' => 200000,
        ]);

        $this->assertNotNull($saving);
        $this->assertEquals('WITHDRAWAL', $saving->transaction_type->value);

        // The withdrawal record should store the resulting balance
        $this->assertEquals(300000, $saving->balance);
    }

    public function test_withdraw_insufficient_balance_throws_exception(): void
    {
        $this->service->deposit([
            'member_id' => $this->member->id,
            'type' => 'SUKARELA',
            'amount' => 100000,
        ]);

        $this->expectException(\Exception::class);
        $this->service->withdraw([
            'member_id' => $this->member->id,
            'type' => 'SUKARELA',
            'amount' => 200000,
        ]);
    }

    // ═══════════ Balance Queries ═══════════

    public function test_initial_balance_is_zero(): void
    {
        $this->assertEquals(0, $this->member->getSavingBalance('POKOK'));
        $this->assertEquals(0, $this->member->getSavingBalance('WAJIB'));
        $this->assertEquals(0, $this->member->getSavingBalance('SUKARELA'));
    }
}
