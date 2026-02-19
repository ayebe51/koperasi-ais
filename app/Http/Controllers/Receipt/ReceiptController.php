<?php

namespace App\Http\Controllers\Receipt;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\LoanPayment;
use App\Models\Sale;
use App\Models\Saving;
use Illuminate\Http\JsonResponse;

class ReceiptController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/receipts/saving/{id}
     * Struk Transaksi Simpanan
     */
    public function saving(string $id): JsonResponse
    {
        $saving = Saving::with('member:id,member_number,name,unit_kerja')
            ->findOrFail($id);

        return $this->success([
            'receipt_type' => 'SIMPANAN',
            'koperasi' => config('app.name', 'Koperasi AIS Ma\'arif Cilacap'),
            'tanggal_cetak' => now()->format('d/m/Y H:i'),
            'transaksi' => [
                'id' => $saving->id,
                'tanggal' => $saving->transaction_date->format('d/m/Y'),
                'jenis_simpanan' => $saving->type->value,
                'tipe_transaksi' => $saving->transaction_type->value,
                'jumlah' => $saving->amount,
                'saldo_akhir' => $saving->balance,
                'referensi' => $saving->reference_number,
                'keterangan' => $saving->description,
            ],
            'anggota' => [
                'nomor' => $saving->member->member_number,
                'nama' => $saving->member->name,
                'unit' => $saving->member->unit_kerja,
            ],
        ], 'Struk Simpanan');
    }

    /**
     * GET /api/receipts/loan-payment/{id}
     * Struk Pembayaran Angsuran Pinjaman
     */
    public function loanPayment(string $id): JsonResponse
    {
        $payment = LoanPayment::with([
            'loan:id,loan_number,amount,remaining_balance',
            'loan.member:id,member_number,name,unit_kerja',
        ])->findOrFail($id);

        return $this->success([
            'receipt_type' => 'ANGSURAN_PINJAMAN',
            'koperasi' => config('app.name', 'Koperasi AIS Ma\'arif Cilacap'),
            'tanggal_cetak' => now()->format('d/m/Y H:i'),
            'transaksi' => [
                'id' => $payment->id,
                'no_kwitansi' => $payment->receipt_number,
                'tanggal_bayar' => $payment->payment_date->format('d/m/Y'),
                'pokok' => $payment->principal_paid,
                'bunga' => $payment->interest_paid,
                'total_bayar' => $payment->total_paid,
                'sisa_pinjaman' => $payment->outstanding_balance,
                'metode_bayar' => $payment->payment_method,
            ],
            'pinjaman' => [
                'nomor' => $payment->loan->loan_number,
                'plafon' => $payment->loan->amount,
            ],
            'anggota' => [
                'nomor' => $payment->loan->member->member_number,
                'nama' => $payment->loan->member->name,
                'unit' => $payment->loan->member->unit_kerja,
            ],
        ], 'Struk Angsuran');
    }

    /**
     * GET /api/receipts/sale/{id}
     * Struk Penjualan Toko
     */
    public function sale(string $id): JsonResponse
    {
        $sale = Sale::with([
            'items.product:id,code,name',
            'member:id,member_number,name',
            'creator:id,name',
        ])->findOrFail($id);

        $items = $sale->items->map(fn($item) => [
            'produk' => $item->product?->name ?? 'Deleted',
            'kode' => $item->product?->code ?? '-',
            'qty' => $item->quantity,
            'harga_satuan' => $item->unit_price,
            'subtotal' => $item->subtotal,
        ]);

        return $this->success([
            'receipt_type' => 'PENJUALAN',
            'koperasi' => config('app.name', 'Koperasi AIS Ma\'arif Cilacap'),
            'tanggal_cetak' => now()->format('d/m/Y H:i'),
            'transaksi' => [
                'id' => $sale->id,
                'nomor' => $sale->sale_number,
                'tanggal' => $sale->sale_date->format('d/m/Y'),
                'subtotal' => $sale->subtotal,
                'diskon' => $sale->discount,
                'total' => $sale->total,
                'metode_bayar' => $sale->payment_method,
                'status_bayar' => $sale->payment_status,
            ],
            'items' => $items,
            'anggota' => $sale->member ? [
                'nomor' => $sale->member->member_number,
                'nama' => $sale->member->name,
            ] : null,
            'kasir' => $sale->creator?->name,
        ], 'Struk Penjualan');
    }
}
