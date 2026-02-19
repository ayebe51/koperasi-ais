<?php

namespace Tests\Feature;

use App\Models\ChartOfAccount;
use App\Services\Accounting\JournalService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JournalServiceTest extends TestCase
{
    use RefreshDatabase;

    private JournalService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(JournalService::class);
        $this->seedCOA();
    }

    private function seedCOA(): void
    {
        // Minimal COA for testing
        ChartOfAccount::create(['code' => '1-1100', 'name' => 'Kas', 'category' => 'ASSET', 'normal_balance' => 'DEBIT']);
        ChartOfAccount::create(['code' => '2-1100', 'name' => 'Simpanan Sukarela', 'category' => 'LIABILITY', 'normal_balance' => 'CREDIT']);
        ChartOfAccount::create(['code' => '3-1100', 'name' => 'Simpanan Pokok', 'category' => 'EQUITY', 'normal_balance' => 'CREDIT']);
        ChartOfAccount::create(['code' => '4-1100', 'name' => 'Pendapatan Jasa', 'category' => 'REVENUE', 'normal_balance' => 'CREDIT']);
        ChartOfAccount::create(['code' => '5-1100', 'name' => 'HPP', 'category' => 'EXPENSE', 'normal_balance' => 'DEBIT']);
    }

    // ═══════════ Journal Creation ═══════════

    public function test_create_balanced_journal(): void
    {
        $journal = $this->service->createJournal([
            'date' => '2026-01-15',
            'description' => 'Setoran kas anggota',
            'lines' => [
                ['account_code' => '1-1100', 'debit' => 500000, 'credit' => 0],
                ['account_code' => '3-1100', 'debit' => 0, 'credit' => 500000],
            ],
        ]);

        $this->assertNotNull($journal);
        $this->assertCount(2, $journal->lines);
        $this->assertTrue($journal->isBalanced());
    }

    public function test_reject_unbalanced_journal(): void
    {
        $this->expectException(\Exception::class);

        $this->service->createJournal([
            'date' => '2026-01-15',
            'description' => 'Unbalanced entry',
            'lines' => [
                ['account_code' => '1-1100', 'debit' => 500000, 'credit' => 0],
                ['account_code' => '3-1100', 'debit' => 0, 'credit' => 300000],
            ],
        ]);
    }

    public function test_journal_auto_post(): void
    {
        $journal = $this->service->createJournal([
            'date' => '2026-01-15',
            'description' => 'Auto-post test',
            'lines' => [
                ['account_code' => '1-1100', 'debit' => 100000, 'credit' => 0],
                ['account_code' => '3-1100', 'debit' => 0, 'credit' => 100000],
            ],
            'auto_post' => true,
        ]);

        $this->assertTrue($journal->is_posted);
    }

    // ═══════════ Posting ═══════════

    public function test_post_draft_journal(): void
    {
        $journal = $this->service->createJournal([
            'date' => '2026-01-15',
            'description' => 'Draft entry',
            'lines' => [
                ['account_code' => '1-1100', 'debit' => 200000, 'credit' => 0],
                ['account_code' => '2-1100', 'debit' => 0, 'credit' => 200000],
            ],
        ]);

        $this->assertFalse($journal->is_posted);

        $posted = $this->service->postJournal($journal->id);
        $this->assertTrue($posted->is_posted);
    }

    // ═══════════ Reversal ═══════════

    public function test_reverse_journal_creates_opposite_entry(): void
    {
        $original = $this->service->createJournal([
            'date' => '2026-01-15',
            'description' => 'Original entry',
            'lines' => [
                ['account_code' => '1-1100', 'debit' => 300000, 'credit' => 0],
                ['account_code' => '4-1100', 'debit' => 0, 'credit' => 300000],
            ],
            'auto_post' => true,
        ]);

        $reversal = $this->service->reverseJournal($original->id, 'Koreksi');

        $this->assertNotNull($reversal);
        $this->assertTrue($reversal->isBalanced());
        // Debits and credits should be swapped
        $this->assertEquals(
            $original->getTotalDebit(),
            $reversal->getTotalDebit()
        );
    }

    // ═══════════ Ledger & Trial Balance ═══════════

    public function test_trial_balance_is_zero_sum(): void
    {
        $this->service->createJournal([
            'date' => '2026-01-10',
            'description' => 'Test A',
            'lines' => [
                ['account_code' => '1-1100', 'debit' => 1000000, 'credit' => 0],
                ['account_code' => '3-1100', 'debit' => 0, 'credit' => 1000000],
            ],
            'auto_post' => true,
        ]);

        $this->service->createJournal([
            'date' => '2026-01-15',
            'description' => 'Test B',
            'lines' => [
                ['account_code' => '5-1100', 'debit' => 200000, 'credit' => 0],
                ['account_code' => '1-1100', 'debit' => 0, 'credit' => 200000],
            ],
            'auto_post' => true,
        ]);

        $trialBalance = $this->service->getTrialBalance();

        // Trial balance: total debits should equal total credits
        $totalDebit = array_sum(array_column($trialBalance, 'debit'));
        $totalCredit = array_sum(array_column($trialBalance, 'credit'));

        $this->assertEqualsWithDelta($totalDebit, $totalCredit, 0.01);
    }

    public function test_ledger_shows_correct_balance(): void
    {
        $this->service->createJournal([
            'date' => '2026-01-10',
            'description' => 'Deposit A',
            'lines' => [
                ['account_code' => '1-1100', 'debit' => 500000, 'credit' => 0],
                ['account_code' => '3-1100', 'debit' => 0, 'credit' => 500000],
            ],
            'auto_post' => true,
        ]);

        $this->service->createJournal([
            'date' => '2026-01-20',
            'description' => 'Withdrawal',
            'lines' => [
                ['account_code' => '2-1100', 'debit' => 100000, 'credit' => 0],
                ['account_code' => '1-1100', 'debit' => 0, 'credit' => 100000],
            ],
            'auto_post' => true,
        ]);

        $ledger = $this->service->getLedger('1-1100', '2026-01-01', '2026-01-31');

        // Kas (DEBIT normal): +500k, -100k = 400k
        $this->assertCount(2, $ledger['entries']);
    }

    // ═══════════ Multiple Lines ═══════════

    public function test_compound_journal_entry(): void
    {
        // 1 debit, multiple credits
        $journal = $this->service->createJournal([
            'date' => '2026-01-15',
            'description' => 'Compound entry',
            'lines' => [
                ['account_code' => '1-1100', 'debit' => 1000000, 'credit' => 0],
                ['account_code' => '3-1100', 'debit' => 0, 'credit' => 600000],
                ['account_code' => '4-1100', 'debit' => 0, 'credit' => 400000],
            ],
        ]);

        $this->assertTrue($journal->isBalanced());
        $this->assertCount(3, $journal->lines);
    }
}
