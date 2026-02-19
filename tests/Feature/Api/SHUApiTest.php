<?php

namespace Tests\Feature\Api;

use App\Enums\MemberStatus;
use App\Enums\UserRole;
use App\Models\ChartOfAccount;
use App\Models\Member;
use App\Models\MemberEquity;
use App\Models\Saving;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SHUApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => UserRole::ADMIN]);
        $this->seedCOA();
    }

    private function seedCOA(): void
    {
        $accounts = [
            ['code' => '1-1100', 'name' => 'Kas', 'category' => 'ASSET', 'normal_balance' => 'DEBIT'],
            ['code' => '2-1500', 'name' => 'Dana Pendidikan', 'category' => 'LIABILITY', 'normal_balance' => 'CREDIT'],
            ['code' => '2-1600', 'name' => 'Dana Sosial', 'category' => 'LIABILITY', 'normal_balance' => 'CREDIT'],
            ['code' => '2-1700', 'name' => 'Dana Pengurus', 'category' => 'LIABILITY', 'normal_balance' => 'CREDIT'],
            ['code' => '2-1800', 'name' => 'Dana Lembaga Ma\'arif', 'category' => 'LIABILITY', 'normal_balance' => 'CREDIT'],
            ['code' => '3-1100', 'name' => 'Simpanan Pokok', 'category' => 'EQUITY', 'normal_balance' => 'CREDIT'],
            ['code' => '3-1200', 'name' => 'Simpanan Wajib', 'category' => 'EQUITY', 'normal_balance' => 'CREDIT'],
            ['code' => '3-1400', 'name' => 'Cadangan Umum', 'category' => 'EQUITY', 'normal_balance' => 'CREDIT'],
            ['code' => '3-1500', 'name' => 'SHU Belum Dibagikan', 'category' => 'EQUITY', 'normal_balance' => 'CREDIT'],
            ['code' => '3-1600', 'name' => 'SHU Tahun Berjalan', 'category' => 'EQUITY', 'normal_balance' => 'CREDIT'],
            ['code' => '4-1100', 'name' => 'Pendapatan Jasa Pinjaman', 'category' => 'REVENUE', 'normal_balance' => 'CREDIT'],
            ['code' => '5-1500', 'name' => 'Beban Administrasi', 'category' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
        ];

        foreach ($accounts as $acc) {
            ChartOfAccount::create($acc);
        }
    }

    // ═══════════ CALCULATE ═══════════

    public function test_calculate_shu_with_no_transactions(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/shu/calculate/2025');

        $response->assertOk()
            ->assertJson(['success' => true])
            ->assertJsonPath('data.fiscal_year', 2025)
            ->assertJsonPath('data.net_shu', 0);
    }

    public function test_calculate_shu_with_revenue(): void
    {
        // Create revenue journal (income > expense => positive SHU)
        $this->createPostedJournal(2025, [
            ['account_code' => '1-1100', 'debit' => 10000000, 'credit' => 0],
            ['account_code' => '4-1100', 'debit' => 0, 'credit' => 10000000],
        ]);

        // Create expense journal
        $this->createPostedJournal(2025, [
            ['account_code' => '5-1500', 'debit' => 2000000, 'credit' => 0],
            ['account_code' => '1-1100', 'debit' => 0, 'credit' => 2000000],
        ]);

        // Create a member with savings
        $member = $this->createMemberWithSavings();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/shu/calculate/2025');

        $response->assertOk()
            ->assertJsonPath('data.net_shu', 8000000) // 10M - 2M
            ->assertJsonStructure([
                'data' => [
                    'fiscal_year',
                    'net_shu',
                    'allocations' => [
                        'cadangan_umum',
                        'dana_pendidikan',
                        'dana_sosial',
                        'dana_pengurus',
                        'total_jasa_anggota',
                    ],
                    'member_count',
                    'members',
                ],
            ]);

        // Verify allocation percentages (config: 40% anggota, 20% cadangan, 17.5% ma'arif, 5% pendidikan, 5% sosial, 12.5% pengurus)
        $data = $response->json('data');
        $this->assertEquals(1600000, $data['allocations']['cadangan_umum']);       // 20%
        $this->assertEquals(1400000, $data['allocations']['lembaga_maarif']);      // 17.5%
        $this->assertEquals(400000, $data['allocations']['dana_pendidikan']);      // 5%
        $this->assertEquals(400000, $data['allocations']['dana_sosial']);          // 5%
        $this->assertEquals(1000000, $data['allocations']['dana_pengurus']);       // 12.5%
        $this->assertEquals(3200000, $data['allocations']['total_jasa_anggota']); // 40%
    }

    // ═══════════ DISTRIBUTE ═══════════

    public function test_distribute_shu(): void
    {
        $this->createPostedJournal(2025, [
            ['account_code' => '1-1100', 'debit' => 5000000, 'credit' => 0],
            ['account_code' => '4-1100', 'debit' => 0, 'credit' => 5000000],
        ]);

        $this->createMemberWithSavings();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/shu/distribute', ['year' => 2025]);

        $response->assertCreated()
            ->assertJson(['success' => true])
            ->assertJsonPath('data.fiscal_year', 2025);

        // Verify distributions persisted
        $this->assertDatabaseHas('shu_distributions', ['fiscal_year' => 2025]);
        $this->assertDatabaseHas('fiscal_periods', ['year' => 2025, 'is_closed' => true]);
    }

    public function test_distribute_shu_prevents_duplicate(): void
    {
        $this->createPostedJournal(2025, [
            ['account_code' => '1-1100', 'debit' => 5000000, 'credit' => 0],
            ['account_code' => '4-1100', 'debit' => 0, 'credit' => 5000000],
        ]);

        $this->createMemberWithSavings();

        // First distribution
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/shu/distribute', ['year' => 2025]);

        // Second attempt should fail
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/shu/distribute', ['year' => 2025]);

        $response->assertUnprocessable();
    }

    // ═══════════ INDEX ═══════════

    public function test_list_distributions(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/shu/2025');

        $response->assertOk()
            ->assertJsonPath('data.fiscal_year', 2025)
            ->assertJsonPath('data.member_count', 0);
    }

    // ═══════════ RBAC ═══════════

    public function test_member_cannot_calculate_shu(): void
    {
        $member = User::factory()->create(['role' => UserRole::MEMBER]);

        $response = $this->actingAs($member, 'sanctum')
            ->getJson('/api/shu/calculate/2025');

        $response->assertForbidden();
    }

    public function test_manager_cannot_distribute_shu(): void
    {
        $manager = User::factory()->create(['role' => UserRole::MANAGER]);

        $response = $this->actingAs($manager, 'sanctum')
            ->postJson('/api/shu/distribute', ['year' => 2025]);

        $response->assertForbidden();
    }

    // ═══════════ Helpers ═══════════

    private function createPostedJournal(int $year, array $lines): void
    {
        $journal = \App\Models\JournalEntry::create([
            'entry_number' => 'JE-TEST-' . fake()->unique()->numerify('###'),
            'entry_date' => "{$year}-06-15",
            'transaction_date' => "{$year}-06-15",
            'description' => 'Test Journal',
            'is_posted' => true,
            'posted_at' => now(),
            'created_by' => $this->admin->id,
        ]);

        foreach ($lines as $line) {
            $account = ChartOfAccount::where('code', $line['account_code'])->first();
            \App\Models\JournalLine::create([
                'journal_entry_id' => $journal->id,
                'account_id' => $account->id,
                'debit' => $line['debit'],
                'credit' => $line['credit'],
            ]);
        }
    }

    private function createMemberWithSavings(): Member
    {
        $member = Member::create([
            'member_number' => 'M-SHU-001',
            'nik' => '3301999999990001',
            'name' => 'Anggota SHU',
            'unit_kerja' => 'Test Unit',
            'status' => MemberStatus::ACTIVE,
            'join_date' => '2024-01-01',
        ]);
        MemberEquity::create(['member_id' => $member->id]);

        // Add savings balance
        Saving::create([
            'member_id' => $member->id,
            'type' => 'POKOK',
            'transaction_type' => 'DEPOSIT',
            'amount' => 100000,
            'balance' => 100000,
            'transaction_date' => '2025-01-15',
        ]);

        Saving::create([
            'member_id' => $member->id,
            'type' => 'WAJIB',
            'transaction_type' => 'DEPOSIT',
            'amount' => 500000,
            'balance' => 500000,
            'transaction_date' => '2025-06-15',
        ]);

        return $member;
    }
}
