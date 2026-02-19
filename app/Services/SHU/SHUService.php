<?php

namespace App\Services\SHU;

use App\Enums\ReferenceType;
use App\Models\ChartOfAccount;
use App\Models\FiscalPeriod;
use App\Models\Loan;
use App\Models\Member;
use App\Models\Saving;
use App\Models\SHUDistribution;
use App\Services\Accounting\JournalService;
use App\Services\Accounting\ReportService;
use Illuminate\Support\Facades\DB;

/**
 * SHU (Sisa Hasil Usaha) Distribution Service
 *
 * Calculates and distributes cooperative surplus to members
 * per AD/ART koperasi. Allocations are configurable via config/shu.php.
 */
class SHUService
{
    public function __construct(
        private ReportService $reportService,
        private JournalService $journalService,
    ) {
    }

    /**
     * Calculate SHU preview for a fiscal year (does NOT persist)
     */
    public function calculate(int $year): array
    {
        $startDate = "{$year}-01-01";
        $endDate = "{$year}-12-31";

        // Get net SHU from income statement
        $incomeStatement = $this->reportService->getIncomeStatement($startDate, $endDate);
        $netSHU = $incomeStatement['net_shu'];

        if ($netSHU <= 0) {
            return [
                'fiscal_year' => $year,
                'net_shu' => $netSHU,
                'message' => 'Tidak ada SHU untuk didistribusikan (rugi atau nol)',
                'allocations' => [],
                'members' => [],
            ];
        }

        // Allocations from config
        $allocations = $this->calculateAllocations($netSHU);

        // Member distributions
        $memberDistributions = $this->calculateMemberDistributions(
            $year,
            $allocations['jasa_simpanan'],
            $allocations['jasa_pinjaman'],
        );

        return [
            'fiscal_year' => $year,
            'net_shu' => $netSHU,
            'allocations' => $allocations,
            'member_count' => count($memberDistributions),
            'members' => $memberDistributions,
        ];
    }

    /**
     * Finalize SHU distribution: persist + create journal entries + close fiscal period
     */
    public function distribute(int $year, int $closedBy): array
    {
        // Prevent duplicate distribution
        $existing = SHUDistribution::where('fiscal_year', $year)->exists();
        if ($existing) {
            throw new \Exception("SHU tahun {$year} sudah pernah didistribusikan.");
        }

        $preview = $this->calculate($year);

        if ($preview['net_shu'] <= 0) {
            throw new \Exception('Tidak ada SHU untuk didistribusikan.');
        }

        return DB::transaction(function () use ($year, $closedBy, $preview) {
            $allocations = $preview['allocations'];
            $accounts = config('shu.accounts');

            // Build journal lines dynamically from config
            $journalLines = [
                [
                    'account_code' => $accounts['shu_tahun_berjalan'],
                    'debit' => $preview['net_shu'],
                    'credit' => 0,
                    'description' => 'Penutupan SHU Tahun Berjalan',
                ],
                [
                    'account_code' => $accounts['cadangan_umum'],
                    'debit' => 0,
                    'credit' => $allocations['cadangan_umum'],
                    'description' => 'Cadangan Umum ' . (config('shu.allocations.cadangan_umum') * 100) . '%',
                ],
                [
                    'account_code' => $accounts['lembaga_maarif'],
                    'debit' => 0,
                    'credit' => $allocations['lembaga_maarif'],
                    'description' => 'Lembaga Ma\'arif ' . (config('shu.allocations.lembaga_maarif') * 100) . '%',
                ],
                [
                    'account_code' => $accounts['dana_pendidikan'],
                    'debit' => 0,
                    'credit' => $allocations['dana_pendidikan'],
                    'description' => 'Dana Pendidikan ' . (config('shu.allocations.dana_pendidikan') * 100) . '%',
                ],
                [
                    'account_code' => $accounts['dana_sosial'],
                    'debit' => 0,
                    'credit' => $allocations['dana_sosial'],
                    'description' => 'Dana Sosial ' . (config('shu.allocations.dana_sosial') * 100) . '%',
                ],
                [
                    'account_code' => $accounts['dana_pengurus'],
                    'debit' => 0,
                    'credit' => $allocations['dana_pengurus'],
                    'description' => 'Dana Pengurus ' . (config('shu.allocations.dana_pengurus') * 100) . '%',
                ],
                [
                    'account_code' => $accounts['shu_belum_dibagi'],
                    'debit' => 0,
                    'credit' => $allocations['total_jasa_anggota'],
                    'description' => 'SHU Anggota ' . (config('shu.allocations.jasa_anggota') * 100) . '%',
                ],
            ];

            $journal = $this->journalService->createJournal([
                'date' => "{$year}-12-31",
                'description' => "Distribusi SHU Tahun {$year}",
                'lines' => $journalLines,
                'reference_type' => ReferenceType::SHU_DISTRIBUTION,
                'created_by' => $closedBy,
                'auto_post' => true,
            ]);

            // Persist member distributions
            $distributions = [];
            foreach ($preview['members'] as $memberData) {
                $distributions[] = SHUDistribution::create([
                    'fiscal_year' => $year,
                    'member_id' => $memberData['member_id'],
                    'jasa_simpanan' => $memberData['jasa_simpanan'],
                    'jasa_pinjaman' => $memberData['jasa_pinjaman'],
                    'jasa_usaha' => 0,
                    'total_shu' => $memberData['total_shu'],
                    'journal_entry_id' => $journal->id,
                ]);
            }

            // Create/close fiscal period
            $fiscal = FiscalPeriod::updateOrCreate(
                ['year' => $year],
                [
                    'start_date' => "{$year}-01-01",
                    'end_date' => "{$year}-12-31",
                    'is_closed' => true,
                    'closed_at' => now(),
                    'closed_by' => $closedBy,
                ]
            );

            return [
                'fiscal_year' => $year,
                'net_shu' => $preview['net_shu'],
                'allocations' => $allocations,
                'distributions_count' => count($distributions),
                'journal_id' => $journal->id,
                'fiscal_period_id' => $fiscal->id,
            ];
        });
    }

    /**
     * Get all distributions for a fiscal year
     */
    public function getDistributions(int $year): array
    {
        $distributions = SHUDistribution::where('fiscal_year', $year)
            ->with('member:id,member_number,name,unit_kerja')
            ->orderByDesc('total_shu')
            ->get();

        $total = $distributions->sum('total_shu');

        return [
            'fiscal_year' => $year,
            'total_distributed' => round($total, 2),
            'member_count' => $distributions->count(),
            'allocations' => config('shu.allocations'),
            'distributions' => $distributions,
        ];
    }

    /**
     * Mark a single distribution as paid
     */
    public function payMember(string $distributionId): SHUDistribution
    {
        $dist = SHUDistribution::findOrFail($distributionId);

        if ($dist->is_paid) {
            throw new \Exception('SHU anggota ini sudah dibayarkan.');
        }

        $dist->update([
            'is_paid' => true,
            'paid_date' => now()->toDateString(),
        ]);

        return $dist->load('member');
    }

    // ══════════ Private Helpers ══════════

    private function calculateAllocations(float $netSHU): array
    {
        $alloc = config('shu.allocations');
        $ratios = config('shu.jasa_anggota_ratio');

        $jasaAnggota = round($netSHU * $alloc['jasa_anggota'], 2);
        $jasaSimpanan = round($jasaAnggota * $ratios['simpanan'], 2);
        $jasaPinjaman = round($jasaAnggota * $ratios['pinjaman'], 2);

        return [
            'cadangan_umum' => round($netSHU * $alloc['cadangan_umum'], 2),
            'lembaga_maarif' => round($netSHU * $alloc['lembaga_maarif'], 2),
            'dana_pendidikan' => round($netSHU * $alloc['dana_pendidikan'], 2),
            'dana_sosial' => round($netSHU * $alloc['dana_sosial'], 2),
            'dana_pengurus' => round($netSHU * $alloc['dana_pengurus'], 2),
            'total_jasa_anggota' => $jasaAnggota,
            'jasa_simpanan' => $jasaSimpanan,
            'jasa_pinjaman' => $jasaPinjaman,
        ];
    }

    /**
     * Distribute jasa anggota proportionally to each member's contribution.
     */
    private function calculateMemberDistributions(int $year, float $poolSimpanan, float $poolPinjaman): array
    {
        $startDate = "{$year}-01-01";
        $endDate = "{$year}-12-31";

        $members = Member::where('status', 'ACTIVE')
            ->with('equity')
            ->get();

        if ($members->isEmpty()) {
            return [];
        }

        // Calculate each member's savings contribution
        $savingsContributions = [];
        $totalSavings = 0;
        foreach ($members as $member) {
            $balance = $this->getMemberTotalSavings($member);
            $savingsContributions[$member->id] = $balance;
            $totalSavings += $balance;
        }

        // Calculate each member's loan interest contribution
        $interestContributions = [];
        $totalInterest = 0;
        foreach ($members as $member) {
            $interest = $this->getMemberInterestPaid($member, $startDate, $endDate);
            $interestContributions[$member->id] = $interest;
            $totalInterest += $interest;
        }

        // Distribute proportionally
        $result = [];
        foreach ($members as $member) {
            $jasaSimpanan = ($totalSavings > 0)
                ? round($poolSimpanan * ($savingsContributions[$member->id] / $totalSavings), 2)
                : 0;

            $jasaPinjaman = ($totalInterest > 0)
                ? round($poolPinjaman * ($interestContributions[$member->id] / $totalInterest), 2)
                : 0;

            $totalShu = round($jasaSimpanan + $jasaPinjaman, 2);

            if ($totalShu > 0) {
                $result[] = [
                    'member_id' => $member->id,
                    'member_number' => $member->member_number,
                    'name' => $member->name,
                    'savings_balance' => $savingsContributions[$member->id],
                    'interest_paid' => $interestContributions[$member->id],
                    'jasa_simpanan' => $jasaSimpanan,
                    'jasa_pinjaman' => $jasaPinjaman,
                    'total_shu' => $totalShu,
                ];
            }
        }

        usort($result, fn($a, $b) => $b['total_shu'] <=> $a['total_shu']);

        return $result;
    }

    private function getMemberTotalSavings(Member $member): float
    {
        $pokok = $member->getSavingBalance('POKOK');
        $wajib = $member->getSavingBalance('WAJIB');
        $sukarela = $member->getSavingBalance('SUKARELA');

        return round($pokok + $wajib + $sukarela, 2);
    }

    private function getMemberInterestPaid(Member $member, string $startDate, string $endDate): float
    {
        return (float) $member->loans()
            ->whereHas('payments', function ($q) use ($startDate, $endDate) {
                $q->whereBetween('payment_date', [$startDate, $endDate]);
            })
            ->with([
                'payments' => function ($q) use ($startDate, $endDate) {
                    $q->whereBetween('payment_date', [$startDate, $endDate]);
                }
            ])
            ->get()
            ->flatMap->payments
            ->sum('interest_amount');
    }
}
