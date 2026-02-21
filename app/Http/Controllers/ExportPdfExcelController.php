<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\Saving;
use App\Models\Loan;
use App\Models\Setting;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;
use Maatwebsite\Excel\Facades\Excel;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Illuminate\Support\Facades\Log;

class ExportPdfExcelController extends Controller
{
    /**
     * Mempersiapkan data Settings Koperasi (Kop Surat)
     */
    private function getKopSurat()
    {
        return [
            'name' => Setting::get('company_name', 'Koperasi Modern'),
            'address' => Setting::get('company_address', 'Jl. Contoh No. 123'),
            'phone' => Setting::get('company_phone', '08123456789'),
            'logo' => Setting::get('company_logo', null),
        ];
    }

    /**
     * GET /api/export/{entity}/pdf
     * entity: members, savings, loans
     */
    public function exportPdf(Request $request, string $entity)
    {
        $kopSurat = $this->getKopSurat();
        $date = now()->format('d M Y');

        switch ($entity) {
            case 'members':
                $data = Member::with('user')->get();
                $title = "Laporan Data Anggota";
                $view = 'exports.members_pdf';
                break;
            case 'savings':
                $data = Saving::with('member')->orderBy('transaction_date', 'desc')->get();
                $title = "Laporan Transaksi Simpanan";
                $view = 'exports.savings_pdf';
                break;
            case 'loans':
                $data = Loan::with('member')->orderBy('created_at', 'desc')->get();
                $title = "Laporan Pinjaman Aktif";
                $view = 'exports.loans_pdf';
                break;
            default:
                return response()->json(['message' => 'Entitas tidak valid'], 404);
        }

        try {
            $pdf = Pdf::loadView($view, [
                'kop' => $kopSurat,
                'title' => $title,
                'date' => $date,
                'data' => $data
            ]);

            return $pdf->download("{$entity}_{$date}.pdf");
        } catch (\Exception $e) {
            Log::error("PDF Export Error: " . $e->getMessage());
            return response()->json(['message' => 'Gagal membuat PDF: ' . $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/export/{entity}/excel
     */
    public function exportExcel(Request $request, string $entity)
    {
        $date = now()->format('Y-m-d');

        switch ($entity) {
            case 'members':
                $export = new MembersExport();
                break;
            case 'savings':
                $export = new SavingsExport();
                break;
            case 'loans':
                $export = new LoansExport();
                break;
            default:
                return response()->json(['message' => 'Entitas tidak valid'], 404);
        }

        return Excel::download($export, "{$entity}_{$date}.xlsx");
    }
}

/**
 * EXCEL EXPORT CLASSES (Using Maatwebsite)
 */
class MembersExport implements FromCollection, WithHeadings, WithMapping, WithStyles
{
    public function collection()
    {
        return Member::all();
    }
    public function headings(): array
    {
        return ['No', 'Nomor Anggota', 'Nama', 'NIK', 'Unit Kerja', 'Tanggal Bergabung', 'Status'];
    }
    public function map($member): array
    {
        static $no = 1;
        return [
            $no++,
            $member->member_number,
            $member->name,
            "'" . $member->nik,
            $member->unit_kerja,
            $member->join_date,
            $member->status->value
        ];
    }
    public function styles(Worksheet $sheet)
    {
        return [1 => ['font' => ['bold' => true]]];
    }
}

class SavingsExport implements FromCollection, WithHeadings, WithMapping, WithStyles
{
    public function collection()
    {
        return Saving::with('member')->orderBy('transaction_date', 'desc')->get();
    }
    public function headings(): array
    {
        return ['No', 'Tanggal', 'Anggota', 'Jenis Simpanan', 'Tipe Transaksi', 'Jumlah', 'Saldo Setelahnya'];
    }
    public function map($saving): array
    {
        static $no = 1;
        return [
            $no++,
            $saving->transaction_date,
            $saving->member?->name,
            $saving->saving_type?->value ?? $saving->type,
            $saving->transaction_type->value,
            $saving->amount,
            $saving->balance
        ];
    }
    public function styles(Worksheet $sheet)
    {
        return [1 => ['font' => ['bold' => true]]];
    }
}

class LoansExport implements FromCollection, WithHeadings, WithMapping, WithStyles
{
    public function collection()
    {
        return Loan::with('member')->orderBy('created_at', 'desc')->get();
    }
    public function headings(): array
    {
        return ['No', 'Nomor Pinjaman', 'Anggota', 'Pokok Pinjaman', 'Tenor', 'Cicilan/Bln', 'Sisa Tagihan', 'Status'];
    }
    public function map($loan): array
    {
        static $no = 1;
        return [
            $no++,
            $loan->loan_number,
            $loan->member?->name,
            $loan->principal_amount,
            $loan->term_months . ' bln',
            $loan->monthly_payment,
            $loan->outstanding_balance,
            $loan->status->value
        ];
    }
    public function styles(Worksheet $sheet)
    {
        return [1 => ['font' => ['bold' => true]]];
    }
}
