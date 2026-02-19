<?php

namespace Tests\Feature\Api;

use App\Enums\UserRole;
use App\Models\ChartOfAccount;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountingApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $accountant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => UserRole::ADMIN]);
        $this->accountant = User::factory()->create(['role' => UserRole::ACCOUNTANT]);
        $this->seedCOA();
    }

    private function seedCOA(): void
    {
        ChartOfAccount::create(['code' => '1-1100', 'name' => 'Kas', 'category' => 'ASSET', 'normal_balance' => 'DEBIT']);
        ChartOfAccount::create(['code' => '2-1100', 'name' => 'Hutang Usaha', 'category' => 'LIABILITY', 'normal_balance' => 'CREDIT']);
        ChartOfAccount::create(['code' => '5-1100', 'name' => 'Beban Operasional', 'category' => 'EXPENSE', 'normal_balance' => 'DEBIT']);
    }

    // ═══════════ COA ═══════════

    public function test_list_chart_of_accounts(): void
    {
        $response = $this->actingAs($this->accountant, 'sanctum')
            ->getJson('/api/accounting/coa');

        $response->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_create_chart_of_account(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/accounting/coa', [
                'code' => '4-1100',
                'name' => 'Pendapatan Bunga',
                'category' => 'REVENUE',
                'normal_balance' => 'CREDIT',
            ]);

        $response->assertCreated()
            ->assertJson(['success' => true])
            ->assertJsonPath('data.code', '4-1100');
    }

    public function test_create_coa_duplicate_code(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/accounting/coa', [
                'code' => '1-1100', // already exists
                'name' => 'Duplicate',
                'category' => 'ASSET',
                'normal_balance' => 'DEBIT',
            ]);

        $response->assertUnprocessable();
    }

    // ═══════════ JOURNAL ENTRIES ═══════════

    public function test_create_balanced_journal(): void
    {
        $response = $this->actingAs($this->accountant, 'sanctum')
            ->postJson('/api/accounting/journals', [
                'date' => '2026-02-01',
                'description' => 'Pembayaran listrik',
                'lines' => [
                    ['account_code' => '5-1100', 'debit' => 500000, 'credit' => 0],
                    ['account_code' => '1-1100', 'debit' => 0, 'credit' => 500000],
                ],
            ]);

        $response->assertCreated()
            ->assertJson(['success' => true]);
    }

    public function test_create_unbalanced_journal_rejected(): void
    {
        $response = $this->actingAs($this->accountant, 'sanctum')
            ->postJson('/api/accounting/journals', [
                'date' => '2026-02-01',
                'description' => 'Unbalanced',
                'lines' => [
                    ['account_code' => '5-1100', 'debit' => 500000, 'credit' => 0],
                    ['account_code' => '1-1100', 'debit' => 0, 'credit' => 300000],
                ],
            ]);

        $response->assertUnprocessable();
    }

    public function test_create_journal_both_debit_and_credit_rejected(): void
    {
        $response = $this->actingAs($this->accountant, 'sanctum')
            ->postJson('/api/accounting/journals', [
                'date' => '2026-02-01',
                'description' => 'Invalid line',
                'lines' => [
                    ['account_code' => '5-1100', 'debit' => 500000, 'credit' => 500000],
                    ['account_code' => '1-1100', 'debit' => 0, 'credit' => 0],
                ],
            ]);

        $response->assertUnprocessable();
    }

    // ═══════════ JOURNAL LIST ═══════════

    public function test_list_journals(): void
    {
        $this->actingAs($this->accountant, 'sanctum')
            ->postJson('/api/accounting/journals', [
                'date' => '2026-02-01',
                'description' => 'Test',
                'lines' => [
                    ['account_code' => '5-1100', 'debit' => 100000, 'credit' => 0],
                    ['account_code' => '1-1100', 'debit' => 0, 'credit' => 100000],
                ],
            ]);

        $response = $this->actingAs($this->accountant, 'sanctum')
            ->getJson('/api/accounting/journals');

        $response->assertOk()
            ->assertJsonStructure(['data', 'meta']);
    }

    // ═══════════ TRIAL BALANCE ═══════════

    public function test_trial_balance(): void
    {
        $response = $this->actingAs($this->accountant, 'sanctum')
            ->getJson('/api/accounting/trial-balance');

        $response->assertOk()
            ->assertJson(['success' => true]);
    }

    // ═══════════ RBAC ═══════════

    public function test_teller_cannot_access_accounting(): void
    {
        $teller = User::factory()->create(['role' => UserRole::TELLER]);

        $response = $this->actingAs($teller, 'sanctum')
            ->getJson('/api/accounting/coa');

        $response->assertForbidden();
    }

    public function test_member_cannot_create_journal(): void
    {
        $member = User::factory()->create(['role' => UserRole::MEMBER]);

        $response = $this->actingAs($member, 'sanctum')
            ->postJson('/api/accounting/journals', [
                'date' => '2026-02-01',
                'description' => 'Hack',
                'lines' => [
                    ['account_code' => '5-1100', 'debit' => 999999, 'credit' => 0],
                    ['account_code' => '1-1100', 'debit' => 0, 'credit' => 999999],
                ],
            ]);

        $response->assertForbidden();
    }
}
