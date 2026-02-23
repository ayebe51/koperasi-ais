<?php

namespace App\Services\Accounting;

use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Parses bank CSV statements into a standardized format
 */
class BankStatementParser
{
    /**
     * Parse CSV content into a collection of standardized mutation arrays
     */
    public function parse(string $content, string $bankType = 'BCA'): Collection
    {
        $lines = explode("\n", str_replace("\r", "", $content));
        $data = collect();

        if (empty($lines)) {
            return $data;
        }

        // Detect delimiter (semicolon is common in Indonesian Excel CSV)
        $firstLine = $lines[0] ?? '';
        $delimiter = str_contains($firstLine, ';') ? ';' : ',';

        $headers = str_getcsv(array_shift($lines), $delimiter);

        foreach ($lines as $line) {
            if (trim($line) === '')
                continue;

            $row = str_getcsv($line, $delimiter);
            if (count($row) < 3)
                continue;

            $standardized = $this->standardizeRow($row, $bankType);
            if ($standardized) {
                $data->push($standardized);
            }
        }

        return $data;
    }

    /**
     * Standardize a single row based on bank format
     */
    private function standardizeRow(array $row, string $bankType): ?array
    {
        try {
            switch (strtoupper($bankType)) {
                case 'BCA':
                    // BCA Format (Approximate): Date, Description, Branch, Amount, Type, Balance
                    $dateRaw = $row[0] ?? ''; // DD/MM
                    $description = $row[1] ?? '';
                    $amountRaw = $row[3] ?? '0';
                    $typeRaw = $row[4] ?? ''; // CR or DB

                    if (strlen($dateRaw) <= 5) {
                        $date = Carbon::createFromFormat('d/m', $dateRaw)->setYear(now()->year);
                    } else {
                        $date = Carbon::parse($dateRaw);
                    }

                    $amount = (float) str_replace(',', '', $amountRaw);
                    $type = (strtoupper($typeRaw) === 'CR' || strtoupper($typeRaw) === 'K') ? 'CREDIT' : 'DEBIT';

                    return [
                        'transaction_date' => $date->toDateString(),
                        'description' => $description,
                        'amount' => $amount,
                        'type' => $type,
                        'bank_name' => 'BCA',
                        'reference_id' => md5($dateRaw . $description . $amountRaw . ($row[5] ?? ''))
                    ];

                case 'MANDIRI':
                    // Mandiri MCM Format: Date, Description, Amount, Type (CR/DB), Balance
                    $dateRaw = $row[0] ?? '';
                    $description = $row[1] ?? '';
                    $amountRaw = $row[2] ?? '0';
                    $typeRaw = $row[3] ?? '';

                    $amount = (float) str_replace([',', '.'], ['', ''], $amountRaw) / 100; // Assuming no decimals in raw if using separator
                    if (str_contains($amountRaw, '.'))
                        $amount = (float) str_replace(',', '', $amountRaw);

                    $type = (strtoupper($typeRaw) === 'CR' || strtoupper($typeRaw) === 'K') ? 'CREDIT' : 'DEBIT';

                    return [
                        'transaction_date' => Carbon::parse($dateRaw)->toDateString(),
                        'description' => $description,
                        'amount' => $amount,
                        'type' => $type,
                        'bank_name' => 'Mandiri',
                        'reference_id' => md5($dateRaw . $description . $amountRaw)
                    ];

                case 'BNI':
                    // BNI Format: Date, Description, Debit, Credit, Balance
                    $dateRaw = $row[0] ?? '';
                    $description = $row[1] ?? '';
                    $debit = (float) str_replace(',', '', $row[2] ?? 0);
                    $credit = (float) str_replace(',', '', $row[3] ?? 0);

                    $amount = $credit > 0 ? $credit : $debit;
                    $type = $credit > 0 ? 'CREDIT' : 'DEBIT';

                    return [
                        'transaction_date' => Carbon::parse($dateRaw)->toDateString(),
                        'description' => $description,
                        'amount' => $amount,
                        'type' => $type,
                        'bank_name' => 'BNI',
                        'reference_id' => md5($dateRaw . $description . $amount)
                    ];

                case 'BRI':
                    // BRI Format: Date, Description, Amount, Type (D/K)
                    $dateRaw = $row[0] ?? '';
                    $description = $row[1] ?? '';
                    $amountRaw = $row[2] ?? '0';
                    $typeRaw = $row[3] ?? '';

                    $amount = (float) str_replace(',', '', $amountRaw);
                    $type = (strtoupper($typeRaw) === 'K' || strtoupper($typeRaw) === 'CREDIT') ? 'CREDIT' : 'DEBIT';

                    return [
                        'transaction_date' => Carbon::parse($dateRaw)->toDateString(),
                        'description' => $description,
                        'amount' => $amount,
                        'type' => $type,
                        'bank_name' => 'BRI',
                        'reference_id' => md5($dateRaw . $description . $amountRaw)
                    ];

                default:
                    // Default generic parser
                    return [
                        'transaction_date' => Carbon::parse($row[0] ?? now())->toDateString(),
                        'description' => $row[1] ?? '',
                        'amount' => (float) str_replace(',', '', $row[2] ?? 0),
                        'type' => (strtoupper($row[3] ?? '') === 'K' || strtoupper($row[3] ?? '') === 'CREDIT' || strtoupper($row[3] ?? '') === 'CR') ? 'CREDIT' : 'DEBIT',
                        'bank_name' => $bankType,
                        'reference_id' => null
                    ];
            }
        } catch (\Exception $e) {
            return null;
        }
    }
}
