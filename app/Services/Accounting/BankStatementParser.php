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
                    // Example: "21/02","KREDIT DARI BP","0000","100000.00","CR","150000.00"

                    $dateRaw = $row[0] ?? ''; // DD/MM
                    $description = $row[1] ?? '';
                    $amountRaw = $row[3] ?? '0';
                    $typeRaw = $row[4] ?? ''; // CR or DB

                    // Handle date (assume current year if only DD/MM)
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

                default:
                    // Default generic parser
                    return [
                        'transaction_date' => Carbon::parse($row[0] ?? now())->toDateString(),
                        'description' => $row[1] ?? '',
                        'amount' => (float) ($row[2] ?? 0),
                        'type' => (strtoupper($row[3] ?? '') === 'K' || strtoupper($row[3] ?? '') === 'CREDIT') ? 'CREDIT' : 'DEBIT',
                        'bank_name' => $bankType,
                        'reference_id' => null
                    ];
            }
        } catch (\Exception $e) {
            return null;
        }
    }
}
