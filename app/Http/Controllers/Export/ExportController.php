<?php

namespace App\Http\Controllers\Export;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Loan;
use App\Models\Member;
use App\Models\Saving;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ExportController extends Controller
{
    use ApiResponse;

    /**
     * Export members to CSV
     * GET /api/export/members
     */
    public function members(Request $request): Response
    {
        $query = Member::with('equity')->orderBy('name');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $members = $query->get();

        $csv = $this->buildCsv(
            ['No. Anggota', 'Nama', 'NIK', 'Unit Kerja', 'Jabatan', 'Status Karyawan', 'Email', 'HP', 'Tgl Masuk', 'Status', 'Simpanan Pokok', 'Simpanan Wajib', 'Simpanan Sukarela'],
            $members->map(fn($m) => [
                $m->member_number,
                $m->name,
                $m->nik,
                $m->unit_kerja,
                $m->jabatan ?? '',
                $m->status_karyawan ?? '',
                $m->email ?? '',
                $m->phone ?? '',
                $m->join_date?->format('Y-m-d') ?? '',
                $m->status->value ?? $m->status,
                $m->getSavingBalance('POKOK'),
                $m->getSavingBalance('WAJIB'),
                $m->getSavingBalance('SUKARELA'),
            ])->toArray()
        );

        return $this->csvResponse($csv, 'anggota_' . date('Ymd'));
    }

    /**
     * Export savings transactions to CSV
     * GET /api/export/savings
     */
    public function savings(Request $request): Response
    {
        $query = Saving::with('member')->orderByDesc('transaction_date');

        if ($request->has('member_id'))
            $query->where('member_id', $request->member_id);
        if ($request->has('type'))
            $query->where('type', $request->type);
        if ($request->has('start_date'))
            $query->where('transaction_date', '>=', $request->start_date);
        if ($request->has('end_date'))
            $query->where('transaction_date', '<=', $request->end_date);

        $savings = $query->get();

        $csv = $this->buildCsv(
            ['Tanggal', 'No. Anggota', 'Nama', 'Jenis', 'Tipe Transaksi', 'Jumlah', 'Saldo', 'Keterangan'],
            $savings->map(fn($s) => [
                $s->transaction_date?->format('Y-m-d') ?? '',
                $s->member?->member_number ?? '',
                $s->member?->name ?? '',
                $s->type,
                $s->transaction_type,
                $s->amount,
                $s->balance,
                $s->description ?? '',
            ])->toArray()
        );

        return $this->csvResponse($csv, 'simpanan_' . date('Ymd'));
    }

    /**
     * Export loans to CSV
     * GET /api/export/loans
     */
    public function loans(Request $request): Response
    {
        $query = Loan::with('member')->orderByDesc('loan_date');

        if ($request->has('status'))
            $query->where('status', $request->status);

        $loans = $query->get();

        $csv = $this->buildCsv(
            ['No. Pinjaman', 'Nama Anggota', 'No. Anggota', 'Tgl Pengajuan', 'Jumlah', 'Tenor (bln)', 'Bunga (%)', 'Sisa Pokok', 'Status', 'Tujuan'],
            $loans->map(fn($l) => [
                $l->loan_number,
                $l->member?->name ?? '',
                $l->member?->member_number ?? '',
                $l->loan_date?->format('Y-m-d') ?? '',
                $l->principal_amount,
                $l->term_months,
                $l->interest_rate,
                $l->getOutstandingBalance(),
                $l->status->value ?? $l->status,
                $l->purpose ?? '',
            ])->toArray()
        );

        return $this->csvResponse($csv, 'pinjaman_' . date('Ymd'));
    }

    // ── Helpers ──

    private function buildCsv(array $headers, array $rows): string
    {
        $handle = fopen('php://temp', 'r+');

        // BOM for Excel UTF-8
        fwrite($handle, "\xEF\xBB\xBF");

        fputcsv($handle, $headers);
        foreach ($rows as $row) {
            fputcsv($handle, $row);
        }

        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        return $csv;
    }

    private function csvResponse(string $csv, string $filename): Response
    {
        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename={$filename}.csv",
        ]);
    }
}
