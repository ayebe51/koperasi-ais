<?php

namespace App\Http\Controllers\Report;

use App\Enums\LoanStatus;
use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\CKPNProvision;
use App\Models\Loan;
use App\Models\LoanPayment;
use App\Models\Product;
use App\Models\Sale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/reports/unit-toko
     * Laporan Unit Usaha Toko — summary penjualan, laba kotor, produk
     */
    public function unitToko(Request $request): JsonResponse
    {
        $startDate = $request->get('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', now()->endOfMonth()->toDateString());

        // Sales summary
        $sales = Sale::whereBetween('sale_date', [$startDate, $endDate]);
        $totalPenjualan = (float) (clone $sales)->sum('total');
        $totalHPP = (float) (clone $sales)->sum('total_cogs');
        $totalDiskon = (float) (clone $sales)->sum('discount');
        $jumlahTransaksi = (clone $sales)->count();
        $labaKotor = round($totalPenjualan - $totalHPP, 2);

        // Top products by sales count
        $topProducts = \App\Models\SaleItem::whereBetween('created_at', [$startDate, $endDate . ' 23:59:59'])
            ->selectRaw('product_id, SUM(quantity) as total_qty, SUM(subtotal) as total_revenue')
            ->groupBy('product_id')
            ->orderByDesc('total_revenue')
            ->limit(10)
            ->with('product:id,code,name')
            ->get()
            ->map(fn($item) => [
                'product' => $item->product?->name ?? 'Deleted',
                'code' => $item->product?->code ?? '-',
                'qty_sold' => (int) $item->total_qty,
                'revenue' => round($item->total_revenue, 2),
            ]);

        // Stock summary
        $totalProduk = Product::where('is_active', true)->count();
        $nilaiPersediaan = (float) Product::where('is_active', true)->selectRaw('SUM(stock * average_cost) as total')->value('total');

        return $this->success([
            'laporan' => 'Laporan Unit Usaha Toko',
            'periode' => ['start' => $startDate, 'end' => $endDate],
            'penjualan' => [
                'jumlah_transaksi' => $jumlahTransaksi,
                'total_penjualan' => round($totalPenjualan, 2),
                'total_diskon' => round($totalDiskon, 2),
                'total_hpp' => round($totalHPP, 2),
                'laba_kotor' => $labaKotor,
                'margin_persen' => $totalPenjualan > 0 ? round(($labaKotor / $totalPenjualan) * 100, 2) : 0,
            ],
            'produk_terlaris' => $topProducts,
            'persediaan' => [
                'total_produk_aktif' => $totalProduk,
                'nilai_persediaan' => round($nilaiPersediaan ?? 0, 2),
            ],
        ], 'Laporan Unit Usaha Toko');
    }

    /**
     * GET /api/reports/unit-pembiayaan
     * Laporan Unit Usaha Pembiayaan — portfolio pinjaman
     */
    public function unitPembiayaan(Request $request): JsonResponse
    {
        $startDate = $request->get('start_date', now()->startOfYear()->toDateString());
        $endDate = $request->get('end_date', now()->toDateString());

        // Loan portfolio
        $activeLoans = Loan::where('status', LoanStatus::ACTIVE)->get();
        $pinjamanAktif = $activeLoans->count();
        $pinjamanLunas = Loan::where('status', LoanStatus::PAID_OFF)->count();
        $totalOutstanding = $activeLoans->sum(fn($loan) => $loan->getOutstandingBalance());
        $totalPlafon = (float) Loan::where('status', LoanStatus::ACTIVE)->sum('principal_amount');

        // Payment collection in period
        $payments = LoanPayment::whereBetween('payment_date', [$startDate, $endDate]);
        $totalPokokDiterima = (float) (clone $payments)->sum('principal_paid');
        $totalBungaDiterima = (float) (clone $payments)->sum('interest_paid');
        $jumlahPembayaran = (clone $payments)->count();

        // Pending approvals
        $pinjamanPending = Loan::where('status', LoanStatus::PENDING)->count();

        // NPL (Non Performing Loan) — collectibility >= 3
        $nplLoans = $activeLoans->filter(fn($loan) => $loan->collectibility->value >= 3);
        $nplCount = $nplLoans->count();
        $nplAmount = $nplLoans->sum(fn($loan) => $loan->getOutstandingBalance());

        return $this->success([
            'laporan' => 'Laporan Unit Usaha Pembiayaan',
            'periode' => ['start' => $startDate, 'end' => $endDate],
            'portfolio' => [
                'pinjaman_aktif' => $pinjamanAktif,
                'pinjaman_lunas' => $pinjamanLunas,
                'pinjaman_pending' => $pinjamanPending,
                'total_plafon_aktif' => round($totalPlafon, 2),
                'total_outstanding' => round($totalOutstanding, 2),
            ],
            'penagihan_periode' => [
                'jumlah_pembayaran' => $jumlahPembayaran,
                'pokok_diterima' => round($totalPokokDiterima, 2),
                'bunga_diterima' => round($totalBungaDiterima, 2),
                'total_diterima' => round($totalPokokDiterima + $totalBungaDiterima, 2),
            ],
            'kualitas_kredit' => [
                'npl_count' => $nplCount,
                'npl_amount' => round($nplAmount, 2),
                'npl_ratio' => $totalOutstanding > 0
                    ? round(($nplAmount / $totalOutstanding) * 100, 2) : 0,
            ],
        ], 'Laporan Unit Usaha Pembiayaan');
    }
}
