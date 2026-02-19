<?php

namespace Database\Seeders;

use App\Models\ChartOfAccount;
use Illuminate\Database\Seeder;

class ChartOfAccountSeeder extends Seeder
{
    public function run(): void
    {
        $accounts = [
            // ═══════════════ ASET (1-xxxx) ═══════════════
            ['code' => '1-0000', 'name' => 'ASET', 'category' => 'ASSET', 'normal_balance' => 'DEBIT', 'report_section' => 'CURRENT_ASSET'],

            // Aset Lancar
            ['code' => '1-1100', 'name' => 'Kas', 'category' => 'ASSET', 'normal_balance' => 'DEBIT', 'report_section' => 'CURRENT_ASSET', 'parent' => '1-0000'],
            ['code' => '1-1110', 'name' => 'Kas Kecil', 'category' => 'ASSET', 'normal_balance' => 'DEBIT', 'report_section' => 'CURRENT_ASSET', 'parent' => '1-1100'],
            ['code' => '1-1120', 'name' => 'Bank BRI', 'category' => 'ASSET', 'normal_balance' => 'DEBIT', 'report_section' => 'CURRENT_ASSET', 'parent' => '1-1100'],
            ['code' => '1-1130', 'name' => 'Bank BSI', 'category' => 'ASSET', 'normal_balance' => 'DEBIT', 'report_section' => 'CURRENT_ASSET', 'parent' => '1-1100'],

            ['code' => '1-1200', 'name' => 'Piutang Usaha', 'category' => 'ASSET', 'normal_balance' => 'DEBIT', 'report_section' => 'CURRENT_ASSET', 'parent' => '1-0000'],
            ['code' => '1-1300', 'name' => 'Piutang Pinjaman Anggota', 'category' => 'ASSET', 'normal_balance' => 'DEBIT', 'report_section' => 'CURRENT_ASSET', 'parent' => '1-0000', 'is_cooperative_specific' => true],
            ['code' => '1-1310', 'name' => 'Cadangan Kerugian Penurunan Nilai', 'category' => 'ASSET', 'normal_balance' => 'CREDIT', 'report_section' => 'CURRENT_ASSET', 'parent' => '1-1300', 'is_cooperative_specific' => true], // Contra asset
            ['code' => '1-1400', 'name' => 'Persediaan Barang Dagangan', 'category' => 'ASSET', 'normal_balance' => 'DEBIT', 'report_section' => 'CURRENT_ASSET', 'parent' => '1-0000'],
            ['code' => '1-1500', 'name' => 'Biaya Dibayar Dimuka', 'category' => 'ASSET', 'normal_balance' => 'DEBIT', 'report_section' => 'CURRENT_ASSET', 'parent' => '1-0000'],
            ['code' => '1-1600', 'name' => 'Pendapatan Yang Masih Harus Diterima', 'category' => 'ASSET', 'normal_balance' => 'DEBIT', 'report_section' => 'CURRENT_ASSET', 'parent' => '1-0000'],

            // Aset Tetap
            ['code' => '1-2000', 'name' => 'ASET TETAP', 'category' => 'ASSET', 'normal_balance' => 'DEBIT', 'report_section' => 'FIXED_ASSET'],
            ['code' => '1-2100', 'name' => 'Tanah', 'category' => 'ASSET', 'normal_balance' => 'DEBIT', 'report_section' => 'FIXED_ASSET', 'parent' => '1-2000'],
            ['code' => '1-2200', 'name' => 'Bangunan', 'category' => 'ASSET', 'normal_balance' => 'DEBIT', 'report_section' => 'FIXED_ASSET', 'parent' => '1-2000'],
            ['code' => '1-2210', 'name' => 'Akumulasi Penyusutan Bangunan', 'category' => 'ASSET', 'normal_balance' => 'CREDIT', 'report_section' => 'FIXED_ASSET', 'parent' => '1-2200'],
            ['code' => '1-2300', 'name' => 'Peralatan', 'category' => 'ASSET', 'normal_balance' => 'DEBIT', 'report_section' => 'FIXED_ASSET', 'parent' => '1-2000'],
            ['code' => '1-2310', 'name' => 'Akumulasi Penyusutan Peralatan', 'category' => 'ASSET', 'normal_balance' => 'CREDIT', 'report_section' => 'FIXED_ASSET', 'parent' => '1-2300'],
            ['code' => '1-2400', 'name' => 'Kendaraan', 'category' => 'ASSET', 'normal_balance' => 'DEBIT', 'report_section' => 'FIXED_ASSET', 'parent' => '1-2000'],
            ['code' => '1-2410', 'name' => 'Akumulasi Penyusutan Kendaraan', 'category' => 'ASSET', 'normal_balance' => 'CREDIT', 'report_section' => 'FIXED_ASSET', 'parent' => '1-2400'],

            // ═══════════════ KEWAJIBAN (2-xxxx) ═══════════════
            ['code' => '2-0000', 'name' => 'KEWAJIBAN', 'category' => 'LIABILITY', 'normal_balance' => 'CREDIT', 'report_section' => 'CURRENT_LIABILITY'],
            ['code' => '2-1100', 'name' => 'Simpanan Sukarela Anggota', 'category' => 'LIABILITY', 'normal_balance' => 'CREDIT', 'report_section' => 'CURRENT_LIABILITY', 'parent' => '2-0000', 'is_cooperative_specific' => true],
            ['code' => '2-1200', 'name' => 'Hutang Usaha', 'category' => 'LIABILITY', 'normal_balance' => 'CREDIT', 'report_section' => 'CURRENT_LIABILITY', 'parent' => '2-0000'],
            ['code' => '2-1300', 'name' => 'Hutang Pajak', 'category' => 'LIABILITY', 'normal_balance' => 'CREDIT', 'report_section' => 'CURRENT_LIABILITY', 'parent' => '2-0000'],
            ['code' => '2-1400', 'name' => 'Biaya Yang Masih Harus Dibayar', 'category' => 'LIABILITY', 'normal_balance' => 'CREDIT', 'report_section' => 'CURRENT_LIABILITY', 'parent' => '2-0000'],
            ['code' => '2-1500', 'name' => 'Dana Pendidikan', 'category' => 'LIABILITY', 'normal_balance' => 'CREDIT', 'report_section' => 'CURRENT_LIABILITY', 'parent' => '2-0000', 'is_cooperative_specific' => true],
            ['code' => '2-1600', 'name' => 'Dana Sosial', 'category' => 'LIABILITY', 'normal_balance' => 'CREDIT', 'report_section' => 'CURRENT_LIABILITY', 'parent' => '2-0000', 'is_cooperative_specific' => true],
            ['code' => '2-1700', 'name' => 'Dana Pengurus & Pengawas', 'category' => 'LIABILITY', 'normal_balance' => 'CREDIT', 'report_section' => 'CURRENT_LIABILITY', 'parent' => '2-0000', 'is_cooperative_specific' => true],
            ['code' => '2-1800', 'name' => 'Dana Lembaga Ma\'arif', 'category' => 'LIABILITY', 'normal_balance' => 'CREDIT', 'report_section' => 'CURRENT_LIABILITY', 'parent' => '2-0000', 'is_cooperative_specific' => true],

            // Kewajiban Jangka Panjang
            ['code' => '2-2000', 'name' => 'KEWAJIBAN JANGKA PANJANG', 'category' => 'LIABILITY', 'normal_balance' => 'CREDIT', 'report_section' => 'LONG_TERM_LIABILITY'],
            ['code' => '2-2100', 'name' => 'Hutang Bank', 'category' => 'LIABILITY', 'normal_balance' => 'CREDIT', 'report_section' => 'LONG_TERM_LIABILITY', 'parent' => '2-2000'],

            // ═══════════════ EKUITAS (3-xxxx) ═══════════════
            ['code' => '3-0000', 'name' => 'EKUITAS', 'category' => 'EQUITY', 'normal_balance' => 'CREDIT', 'report_section' => 'MEMBER_EQUITY'],
            ['code' => '3-1100', 'name' => 'Simpanan Pokok', 'category' => 'EQUITY', 'normal_balance' => 'CREDIT', 'report_section' => 'MEMBER_EQUITY', 'parent' => '3-0000', 'is_cooperative_specific' => true],
            ['code' => '3-1200', 'name' => 'Simpanan Wajib', 'category' => 'EQUITY', 'normal_balance' => 'CREDIT', 'report_section' => 'MEMBER_EQUITY', 'parent' => '3-0000', 'is_cooperative_specific' => true],
            ['code' => '3-1300', 'name' => 'Modal Penyertaan', 'category' => 'EQUITY', 'normal_balance' => 'CREDIT', 'report_section' => 'MEMBER_EQUITY', 'parent' => '3-0000', 'is_cooperative_specific' => true],
            ['code' => '3-1400', 'name' => 'Cadangan Umum', 'category' => 'EQUITY', 'normal_balance' => 'CREDIT', 'report_section' => 'RETAINED_SURPLUS', 'parent' => '3-0000', 'is_cooperative_specific' => true],
            ['code' => '3-1500', 'name' => 'SHU Belum Dibagikan', 'category' => 'EQUITY', 'normal_balance' => 'CREDIT', 'report_section' => 'RETAINED_SURPLUS', 'parent' => '3-0000', 'is_cooperative_specific' => true],
            ['code' => '3-1600', 'name' => 'SHU Tahun Berjalan', 'category' => 'EQUITY', 'normal_balance' => 'CREDIT', 'report_section' => 'RETAINED_SURPLUS', 'parent' => '3-0000', 'is_cooperative_specific' => true],
            ['code' => '3-1700', 'name' => 'Donasi', 'category' => 'EQUITY', 'normal_balance' => 'CREDIT', 'report_section' => 'MEMBER_EQUITY', 'parent' => '3-0000'],

            // ═══════════════ PENDAPATAN (4-xxxx) ═══════════════
            ['code' => '4-0000', 'name' => 'PENDAPATAN', 'category' => 'REVENUE', 'normal_balance' => 'CREDIT', 'report_section' => 'OPERATING_REVENUE'],
            ['code' => '4-1100', 'name' => 'Pendapatan Jasa Pinjaman', 'category' => 'REVENUE', 'normal_balance' => 'CREDIT', 'report_section' => 'OPERATING_REVENUE', 'parent' => '4-0000', 'is_cooperative_specific' => true],
            ['code' => '4-1200', 'name' => 'Pendapatan Administrasi', 'category' => 'REVENUE', 'normal_balance' => 'CREDIT', 'report_section' => 'OPERATING_REVENUE', 'parent' => '4-0000'],
            ['code' => '4-1300', 'name' => 'Pendapatan Provisi', 'category' => 'REVENUE', 'normal_balance' => 'CREDIT', 'report_section' => 'OPERATING_REVENUE', 'parent' => '4-0000'],
            ['code' => '4-1400', 'name' => 'Pendapatan Penjualan Toko', 'category' => 'REVENUE', 'normal_balance' => 'CREDIT', 'report_section' => 'OPERATING_REVENUE', 'parent' => '4-0000'],
            ['code' => '4-2100', 'name' => 'Pendapatan Lain-lain', 'category' => 'REVENUE', 'normal_balance' => 'CREDIT', 'report_section' => 'OTHER_REVENUE', 'parent' => '4-0000'],

            // ═══════════════ BEBAN (5-xxxx) ═══════════════
            ['code' => '5-0000', 'name' => 'BEBAN', 'category' => 'EXPENSE', 'normal_balance' => 'DEBIT', 'report_section' => 'OPERATING_EXPENSE'],
            ['code' => '5-1100', 'name' => 'Harga Pokok Penjualan Toko', 'category' => 'EXPENSE', 'normal_balance' => 'DEBIT', 'report_section' => 'OPERATING_EXPENSE', 'parent' => '5-0000'],
            ['code' => '5-1200', 'name' => 'Beban Gaji & Tunjangan', 'category' => 'EXPENSE', 'normal_balance' => 'DEBIT', 'report_section' => 'OPERATING_EXPENSE', 'parent' => '5-0000'],
            ['code' => '5-1300', 'name' => 'Beban Penyusutan', 'category' => 'EXPENSE', 'normal_balance' => 'DEBIT', 'report_section' => 'OPERATING_EXPENSE', 'parent' => '5-0000'],
            ['code' => '5-1400', 'name' => 'Beban Penyisihan Piutang', 'category' => 'EXPENSE', 'normal_balance' => 'DEBIT', 'report_section' => 'OPERATING_EXPENSE', 'parent' => '5-0000', 'is_cooperative_specific' => true],
            ['code' => '5-1500', 'name' => 'Beban Administrasi & Umum', 'category' => 'EXPENSE', 'normal_balance' => 'DEBIT', 'report_section' => 'OPERATING_EXPENSE', 'parent' => '5-0000'],
            ['code' => '5-1600', 'name' => 'Beban RAT', 'category' => 'EXPENSE', 'normal_balance' => 'DEBIT', 'report_section' => 'OPERATING_EXPENSE', 'parent' => '5-0000', 'is_cooperative_specific' => true],
            ['code' => '5-1700', 'name' => 'Beban Pendidikan', 'category' => 'EXPENSE', 'normal_balance' => 'DEBIT', 'report_section' => 'OPERATING_EXPENSE', 'parent' => '5-0000'],
            ['code' => '5-1800', 'name' => 'Beban Listrik, Air & Telepon', 'category' => 'EXPENSE', 'normal_balance' => 'DEBIT', 'report_section' => 'OPERATING_EXPENSE', 'parent' => '5-0000'],
            ['code' => '5-1900', 'name' => 'Beban Sewa', 'category' => 'EXPENSE', 'normal_balance' => 'DEBIT', 'report_section' => 'OPERATING_EXPENSE', 'parent' => '5-0000'],
            ['code' => '5-2100', 'name' => 'Beban Lain-lain', 'category' => 'EXPENSE', 'normal_balance' => 'DEBIT', 'report_section' => 'OTHER_EXPENSE', 'parent' => '5-0000'],
        ];

        // First pass: create all accounts without parent references
        $createdAccounts = [];
        foreach ($accounts as $acc) {
            $parentId = null;
            if (isset($acc['parent'])) {
                $parentCode = $acc['parent'];
                unset($acc['parent']);
                // Store parent code for second pass
                $acc['_parent_code'] = $parentCode;
            }

            $model = ChartOfAccount::create([
                'code' => $acc['code'],
                'name' => $acc['name'],
                'category' => $acc['category'],
                'normal_balance' => $acc['normal_balance'],
                'report_section' => $acc['report_section'] ?? null,
                'is_cooperative_specific' => $acc['is_cooperative_specific'] ?? false,
                'is_active' => true,
            ]);

            $createdAccounts[$acc['code']] = $model;
        }

        // Second pass: set parent references
        foreach ($accounts as $acc) {
            if (isset($acc['_parent_code'])) {
                $parent = $createdAccounts[$acc['_parent_code']] ?? null;
                if ($parent) {
                    $createdAccounts[$acc['code']]->update(['parent_id' => $parent->id]);
                }
            }
        }

        $this->command->info("Seeded " . count($accounts) . " Chart of Accounts");
    }
}
