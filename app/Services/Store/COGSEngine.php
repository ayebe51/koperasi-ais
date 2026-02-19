<?php

namespace App\Services\Store;

use App\Enums\COGSMethod;
use App\Models\Product;
use App\Models\ProductBatch;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * COGS (Harga Pokok Penjualan) Calculator
 *
 * Supports FIFO and Weighted Average methods
 */
class COGSEngine
{
    /**
     * Calculate COGS for a quantity of product
     *
     * @return array{cogs: float, batches_consumed: array}
     */
    public function calculateCOGS(Product $product, int $quantity): array
    {
        if ($product->stock < $quantity) {
            throw new InvalidArgumentException(
                "Insufficient stock for {$product->name}: requested {$quantity}, available {$product->stock}"
            );
        }

        return match ($product->cogs_method) {
            COGSMethod::FIFO => $this->calculateFIFO($product, $quantity),
            COGSMethod::AVERAGE => $this->calculateAverage($product, $quantity),
        };
    }

    /**
     * FIFO: First In, First Out
     * Consume oldest batches first
     */
    private function calculateFIFO(Product $product, int $quantity): array
    {
        $batches = $product->availableBatches()->get();
        $remaining = $quantity;
        $totalCOGS = 0;
        $consumed = [];

        foreach ($batches as $batch) {
            if ($remaining <= 0)
                break;

            $takeQty = min($remaining, $batch->remaining_qty);
            $cost = round($takeQty * (float) $batch->unit_cost, 2);
            $totalCOGS += $cost;
            $remaining -= $takeQty;

            $consumed[] = [
                'batch_id' => $batch->id,
                'quantity' => $takeQty,
                'unit_cost' => (float) $batch->unit_cost,
                'total_cost' => $cost,
            ];
        }

        return [
            'method' => 'FIFO',
            'cogs' => round($totalCOGS, 2),
            'unit_cogs' => $quantity > 0 ? round($totalCOGS / $quantity, 2) : 0,
            'batches_consumed' => $consumed,
        ];
    }

    /**
     * Average: Weighted Average Cost
     */
    private function calculateAverage(Product $product, int $quantity): array
    {
        $averageCost = (float) $product->average_cost;
        $totalCOGS = round($averageCost * $quantity, 2);

        return [
            'method' => 'AVERAGE',
            'cogs' => $totalCOGS,
            'unit_cogs' => $averageCost,
            'batches_consumed' => [],
        ];
    }

    /**
     * Process the actual stock reduction when a sale happens
     */
    public function deductStock(Product $product, int $quantity): float
    {
        $result = $this->calculateCOGS($product, $quantity);

        DB::transaction(function () use ($product, $quantity, $result) {
            if ($product->cogs_method === COGSMethod::FIFO) {
                foreach ($result['batches_consumed'] as $consumed) {
                    ProductBatch::where('id', $consumed['batch_id'])
                        ->decrement('remaining_qty', $consumed['quantity']);
                }
            }

            $product->decrement('stock', $quantity);
        });

        return $result['cogs'];
    }

    /**
     * Receive stock and update average cost
     */
    public function receiveStock(Product $product, int $quantity, float $unitCost, ?string $supplier = null): ProductBatch
    {
        return DB::transaction(function () use ($product, $quantity, $unitCost, $supplier) {
            $batch = ProductBatch::create([
                'product_id' => $product->id,
                'purchase_date' => now()->toDateString(),
                'quantity' => $quantity,
                'remaining_qty' => $quantity,
                'unit_cost' => $unitCost,
                'supplier' => $supplier,
            ]);

            // Recalculate weighted average
            $oldTotal = (float) $product->average_cost * $product->stock;
            $newTotal = $unitCost * $quantity;
            $newStock = $product->stock + $quantity;
            $newAverage = $newStock > 0 ? round(($oldTotal + $newTotal) / $newStock, 2) : 0;

            $product->update([
                'stock' => $newStock,
                'average_cost' => $newAverage,
            ]);

            return $batch;
        });
    }
}
