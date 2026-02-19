<?php

namespace Database\Seeders;

use App\Enums\LoanStatus;
use App\Enums\MemberStatus;
use App\Enums\SavingType;
use App\Models\Loan;
use App\Models\LoanPayment;
use App\Models\Member;
use App\Models\MemberEquity;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Saving;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🌱 Seeding demo data...');

        // ─── Members ───
        $memberData = [
            ['AGT-001', 'Ahmad Suharto', "MI Ma'arif NU 01 Cilacap", 'Guru', 'GTY', '3301010101010001'],
            ['AGT-002', 'Siti Nurjanah', "MTs Ma'arif NU 01 Cilacap", 'Guru', 'PNS', '3301010101010002'],
            ['AGT-003', 'Bambang Purnomo', "MA Ma'arif NU 01 Cilacap", 'Guru', 'GTY', '3301010101010003'],
            ['AGT-004', 'Dewi Rahayu', "MI Ma'arif NU 02 Gandrungmangu", 'Guru', 'GTT', '3301010101010004'],
            ['AGT-005', 'Eko Prasetyo', "MTs Ma'arif NU 01 Majenang", 'Kepala Sekolah', 'PNS', '3301010101010005'],
            ['AGT-006', 'Fatimah Azzahra', "MI Ma'arif NU 01 Sidareja", 'Guru', 'GTY', '3301010101010006'],
            ['AGT-007', 'Gunawan Wicaksono', "MA Ma'arif NU 01 Majenang", 'Guru', 'PNS', '3301010101010007'],
            ['AGT-008', 'Hesti Wulandari', "MI Ma'arif NU 03 Cilacap", 'Guru', 'GTT', '3301010101010008'],
            ['AGT-009', 'Imam Syafii', "MTs Ma'arif NU 02 Sidareja", 'Guru', 'GTY', '3301010101010009'],
            ['AGT-010', 'Jamilah Nur', "MI Ma'arif NU 01 Kroya", 'Kepala Sekolah', 'PNS', '3301010101010010'],
            ['AGT-011', 'Khoirul Anam', "MTs Ma'arif NU 01 Kroya", 'Guru', 'GTY', '3301010101010011'],
            ['AGT-012', 'Lestari Widodo', "MA Ma'arif NU 01 Cilacap", 'TU', 'Honorer', '3301010101010012'],
            ['AGT-013', 'Muhammad Rizki', "MI Ma'arif NU 02 Cilacap", 'Guru', 'GTY', '3301010101010013'],
            ['AGT-014', 'Nur Aini', "MTs Ma'arif NU 01 Gandrungmangu", 'Guru', 'PNS', '3301010101010014'],
            ['AGT-015', 'Omar Faruq', "MI Ma'arif NU 01 Majenang", 'Guru', 'GTY', '3301010101010015'],
        ];

        $members = [];
        foreach ($memberData as $i => $d) {
            $member = Member::create([
                'member_number' => $d[0],
                'name' => $d[1],
                'unit_kerja' => $d[2],
                'jabatan' => $d[3],
                'status_karyawan' => $d[4],
                'nik' => $d[5],
                'phone' => '08' . rand(1000000000, 9999999999),
                'email' => Str::slug($d[1], '.') . '@mail.com',
                'address' => 'Kab. Cilacap, Jawa Tengah',
                'join_date' => now()->subMonths(rand(6, 36))->format('Y-m-d'),
                'status' => MemberStatus::ACTIVE,
            ]);
            MemberEquity::create(['member_id' => $member->id]);
            $members[] = $member;
        }

        $this->command->info("  ✓ 15 anggota");

        // ─── Simpanan ───
        $savingCount = 0;
        foreach ($members as $member) {
            // Simpanan Pokok
            $balance = 100000;
            Saving::create([
                'member_id' => $member->id,
                'type' => SavingType::POKOK,
                'transaction_type' => 'DEPOSIT',
                'amount' => $balance,
                'balance' => $balance,
                'transaction_date' => $member->join_date,
                'description' => 'Simpanan pokok awal',
            ]);
            $savingCount++;

            // Simpanan Wajib (bulanan, 3-10 bulan)
            $months = rand(3, 10);
            $wajibBalance = 0;
            for ($m = 0; $m < $months; $m++) {
                $wajibBalance += 50000;
                Saving::create([
                    'member_id' => $member->id,
                    'type' => SavingType::WAJIB,
                    'transaction_type' => 'DEPOSIT',
                    'amount' => 50000,
                    'balance' => $wajibBalance,
                    'transaction_date' => now()->subMonths($months - $m)->format('Y-m-d'),
                    'description' => 'Simpanan wajib bulanan',
                ]);
                $savingCount++;
            }

            // Simpanan Sukarela (beberapa anggota)
            if (rand(0, 1)) {
                $sukarelaAmounts = [200000, 500000, 1000000, 150000, 300000];
                $sukBalance = 0;
                $txCount = rand(1, 3);
                for ($t = 0; $t < $txCount; $t++) {
                    $amt = $sukarelaAmounts[array_rand($sukarelaAmounts)];
                    $sukBalance += $amt;
                    Saving::create([
                        'member_id' => $member->id,
                        'type' => SavingType::SUKARELA,
                        'transaction_type' => 'DEPOSIT',
                        'amount' => $amt,
                        'balance' => $sukBalance,
                        'transaction_date' => now()->subDays(rand(5, 180))->format('Y-m-d'),
                        'description' => 'Setoran sukarela',
                    ]);
                    $savingCount++;
                }
            }
        }
        $this->command->info("  ✓ {$savingCount} transaksi simpanan");

        // ─── Pinjaman ───
        $loanCount = 0;
        $loanMembers = array_slice($members, 0, 8);
        foreach ($loanMembers as $i => $member) {
            $amounts = [3000000, 5000000, 7500000, 10000000, 15000000];
            $principalAmount = $amounts[array_rand($amounts)];
            $termMonths = [6, 12, 18, 24][array_rand([6, 12, 18, 24])];
            $rate = 12.0; // 12% per year
            $loanDate = now()->subMonths(rand(2, 12));

            $status = $i < 5 ? LoanStatus::ACTIVE : ($i < 7 ? LoanStatus::PAID_OFF : LoanStatus::PENDING);

            $monthlyPayment = $this->calculateMonthlyPayment($principalAmount, $rate, $termMonths);

            $loan = Loan::create([
                'member_id' => $member->id,
                'loan_number' => 'PJM-' . str_pad($i + 1, 4, '0', STR_PAD_LEFT),
                'principal_amount' => $principalAmount,
                'term_months' => $termMonths,
                'interest_rate' => $rate,
                'monthly_payment' => $monthlyPayment,
                'loan_date' => $loanDate->format('Y-m-d'),
                'due_date' => $loanDate->copy()->addMonths($termMonths)->format('Y-m-d'),
                'status' => $status,
                'purpose' => ['Modal usaha', 'Pendidikan anak', 'Renovasi rumah', 'Keperluan darurat'][array_rand(['Modal usaha', 'Pendidikan anak', 'Renovasi rumah', 'Keperluan darurat'])],
            ]);

            // Add payments for active/paid loans
            if ($status !== LoanStatus::PENDING) {
                $remaining = $principalAmount;
                $monthlyPrincipal = round($principalAmount / $termMonths, 2);
                $paymentCount = $status === LoanStatus::PAID_OFF ? $termMonths : rand(2, min($termMonths - 1, 6));

                for ($p = 0; $p < $paymentCount; $p++) {
                    $principal = min($monthlyPrincipal, $remaining);
                    $interest = round($remaining * ($rate / 100 / 12), 2);
                    $remaining = max($remaining - $principal, 0);

                    LoanPayment::create([
                        'loan_id' => $loan->id,
                        'payment_date' => $loanDate->copy()->addMonths($p + 1)->format('Y-m-d'),
                        'principal_paid' => $principal,
                        'interest_paid' => $interest,
                        'total_paid' => $principal + $interest,
                        'outstanding_balance' => $remaining,
                        'receipt_number' => 'KWT-' . str_pad(($i * 20) + $p + 1, 5, '0', STR_PAD_LEFT),
                    ]);
                }
            }

            $loanCount++;
        }
        $this->command->info("  ✓ {$loanCount} pinjaman (5 aktif, 2 lunas, 1 pending)");

        // ─── Produk Toko ───
        $productData = [
            ['PRD-001', 'Buku Tulis Kiky 58', 4500, 'pcs', 3500],
            ['PRD-002', 'Pensil 2B Faber Castell', 3000, 'pcs', 2000],
            ['PRD-003', 'Pulpen Pilot G-1', 7500, 'pcs', 5000],
            ['PRD-004', 'Penghapus Staedtler', 3500, 'pcs', 2500],
            ['PRD-005', 'Penggaris 30cm', 5000, 'pcs', 3000],
            ['PRD-006', 'Spidol Whiteboard Snowman', 10000, 'pcs', 7000],
            ['PRD-007', 'Map Plastik F4', 2500, 'pcs', 1500],
            ['PRD-008', 'Kertas HVS A4 (Rim)', 48000, 'rim', 38000],
            ['PRD-009', 'Tinta Printer Canon', 55000, 'btl', 35000],
            ['PRD-010', 'Buku Gambar A3', 12000, 'pcs', 8000],
            ['PRD-011', 'Lem Stick UHU', 8500, 'pcs', 6000],
            ['PRD-012', "Seragam Batik LP Ma'arif", 125000, 'pcs', 95000],
        ];

        $products = [];
        foreach ($productData as $pd) {
            $stock = rand(15, 200);
            $products[] = Product::create([
                'code' => $pd[0],
                'name' => $pd[1],
                'sell_price' => $pd[2],
                'unit' => $pd[3],
                'average_cost' => $pd[4],
                'stock' => $stock,
                'is_active' => true,
            ]);
        }
        $this->command->info("  ✓ 12 produk toko");

        // ─── Penjualan ───
        $saleCount = 0;
        for ($s = 0; $s < 20; $s++) {
            $saleDate = now()->subDays(rand(1, 60));
            $buyMember = rand(0, 1) ? $members[array_rand($members)] : null;
            $subtotal = 0;

            $sale = Sale::create([
                'sale_number' => 'NTA-' . str_pad($s + 1, 5, '0', STR_PAD_LEFT),
                'member_id' => $buyMember?->id,
                'sale_date' => $saleDate->format('Y-m-d'),
                'subtotal' => 0,
                'discount' => 0,
                'total' => 0,
                'payment_status' => 'PAID',
            ]);

            $itemCount = rand(1, 4);
            $usedProducts = collect($products)->random(min($itemCount, count($products)));
            foreach ($usedProducts as $product) {
                $qty = rand(1, 5);
                $lineTotal = $product->sell_price * $qty;
                $subtotal += $lineTotal;

                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $product->id,
                    'quantity' => $qty,
                    'unit_price' => $product->sell_price,
                    'subtotal' => $lineTotal,
                ]);
            }

            $discount = rand(0, 3) === 0 ? round($subtotal * 0.05) : 0;
            $sale->update([
                'subtotal' => $subtotal,
                'discount' => $discount,
                'total' => $subtotal - $discount,
            ]);
            $saleCount++;
        }
        $this->command->info("  ✓ {$saleCount} penjualan");

        $this->command->info('✅  Demo data seeding complete!');
    }

    private function calculateMonthlyPayment(float $principal, float $annualRate, int $months): float
    {
        $monthlyRate = $annualRate / 100 / 12;
        if ($monthlyRate === 0.0) {
            return round($principal / $months, 2);
        }
        return round($principal * ($monthlyRate * pow(1 + $monthlyRate, $months)) / (pow(1 + $monthlyRate, $months) - 1), 2);
    }
}
