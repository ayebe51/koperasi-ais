<?php

namespace App\Http\Controllers\Dashboard;

use App\Enums\LoanStatus;
use App\Enums\MemberStatus;
use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Loan;
use App\Models\LoanSchedule;
use App\Models\Member;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Saving;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/dashboard/stats
     */
    public function stats(): JsonResponse
    {
        $now = now();
        $startOfMonth = $now->copy()->startOfMonth()->toDateString();
        $endOfMonth = $now->copy()->endOfMonth()->toDateString();

        // ─── Anggota ───
        $totalAnggotaAktif = Member::where('status', MemberStatus::ACTIVE)->count();
        $anggotaBaru = Member::where('status', MemberStatus::ACTIVE)
            ->whereBetween('join_date', [$startOfMonth, $endOfMonth])
            ->count();

        // ─── Simpanan ───
        $simpananPokok = $this->latestSavingBalance('POKOK');
        $simpananWajib = $this->latestSavingBalance('WAJIB');
        $simpananSukarela = $this->latestSavingBalance('SUKARELA');

        // ─── Pinjaman ───
        $pinjamanAktif = Loan::where('status', LoanStatus::ACTIVE)->count();
        $outstandingPinjaman = (float) Loan::where('status', LoanStatus::ACTIVE)
            ->sum('remaining_balance');
        $pinjamanPending = Loan::where('status', LoanStatus::PENDING)->count();

        // ─── Toko ───
        $totalProduk = Product::where('is_active', true)->count();
        $produkStokRendah = Product::where('is_active', true)
            ->where('stock', '<=', 10)
            ->count();
        $penjualanBulanIni = (float) Sale::whereBetween('sale_date', [$startOfMonth, $endOfMonth])
            ->sum('total');

        // ─── Angsuran Jatuh Tempo ───
        $overdueSchedules = LoanSchedule::with([
            'loan:id,loan_number',
            'loan.member:id,member_number,name',
        ])
            ->where('is_paid', false)
            ->where('due_date', '<', $now->toDateString())
            ->orderBy('due_date')
            ->limit(10)
            ->get()
            ->map(fn($s) => [
                'id' => $s->id,
                'loan_number' => $s->loan?->loan_number,
                'member_name' => $s->loan?->member?->name,
                'installment_number' => $s->installment_number,
                'due_date' => $s->due_date->format('Y-m-d'),
                'total_amount' => $s->total_amount,
                'days_overdue' => $now->diffInDays($s->due_date),
            ]);

        $upcomingSchedules = LoanSchedule::with([
            'loan:id,loan_number',
            'loan.member:id,member_number,name',
        ])
            ->where('is_paid', false)
            ->whereBetween('due_date', [$now->toDateString(), $now->copy()->addDays(7)->toDateString()])
            ->orderBy('due_date')
            ->limit(10)
            ->get()
            ->map(fn($s) => [
                'id' => $s->id,
                'loan_number' => $s->loan?->loan_number,
                'member_name' => $s->loan?->member?->name,
                'installment_number' => $s->installment_number,
                'due_date' => $s->due_date->format('Y-m-d'),
                'total_amount' => $s->total_amount,
            ]);

        return $this->success([
            'anggota' => [
                'aktif' => $totalAnggotaAktif,
                'baru_bulan_ini' => $anggotaBaru,
            ],
            'simpanan' => [
                'pokok' => $simpananPokok,
                'wajib' => $simpananWajib,
                'sukarela' => $simpananSukarela,
                'total' => round($simpananPokok + $simpananWajib + $simpananSukarela, 2),
            ],
            'pinjaman' => [
                'aktif' => $pinjamanAktif,
                'pending' => $pinjamanPending,
                'outstanding' => round($outstandingPinjaman, 2),
            ],
            'toko' => [
                'total_produk' => $totalProduk,
                'stok_rendah' => $produkStokRendah,
                'penjualan_bulan_ini' => round($penjualanBulanIni, 2),
            ],
            'angsuran' => [
                'overdue' => $overdueSchedules,
                'upcoming' => $upcomingSchedules,
                'overdue_count' => $overdueSchedules->count(),
                'upcoming_count' => $upcomingSchedules->count(),
            ],
            'periode' => [
                'bulan' => $now->format('F Y'),
                'tanggal' => $now->toDateString(),
            ],
        ], 'Dashboard statistik');
    }

    /**
     * Sum the latest balance of each member's savings by type.
     */
    private function latestSavingBalance(string $type): float
    {
        $members = Member::where('status', MemberStatus::ACTIVE)->get();
        $total = 0;

        foreach ($members as $member) {
            $total += $member->getSavingBalance($type);
        }

        return round($total, 2);
    }
}
