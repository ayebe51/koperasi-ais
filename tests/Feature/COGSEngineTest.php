<?php

namespace Tests\Feature;

use App\Enums\COGSMethod;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Services\Store\COGSEngine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class COGSEngineTest extends TestCase
{
    use RefreshDatabase;

    private COGSEngine $engine;

    protected function setUp(): void
    {
        parent::setUp();
        $this->engine = new COGSEngine();
    }

    // ═══════════ FIFO Method ═══════════

    public function test_fifo_single_batch(): void
    {
        $product = Product::create([
            'code' => 'PRD-001',
            'name' => 'Gula Pasir 1kg',
            'sell_price' => 15000,
            'cogs_method' => COGSMethod::FIFO,
            'stock' => 10,
            'average_cost' => 12000,
        ]);

        ProductBatch::create([
            'product_id' => $product->id,
            'purchase_date' => '2026-01-01',
            'quantity' => 10,
            'remaining_qty' => 10,
            'unit_cost' => 12000,
        ]);

        $result = $this->engine->calculateCOGS($product, 5);

        $this->assertEquals('FIFO', $result['method']);
        $this->assertEquals(60000, $result['cogs']); // 5 × 12000
        $this->assertEquals(12000, $result['unit_cogs']);
        $this->assertCount(1, $result['batches_consumed']);
    }

    public function test_fifo_multiple_batches_different_costs(): void
    {
        $product = Product::create([
            'code' => 'PRD-002',
            'name' => 'Minyak Goreng 1L',
            'sell_price' => 18000,
            'cogs_method' => COGSMethod::FIFO,
            'stock' => 15,
            'average_cost' => 14000,
        ]);

        // Batch 1: older, cheaper
        ProductBatch::create([
            'product_id' => $product->id,
            'purchase_date' => '2026-01-01',
            'quantity' => 10,
            'remaining_qty' => 5,
            'unit_cost' => 13000,
        ]);

        // Batch 2: newer, more expensive
        ProductBatch::create([
            'product_id' => $product->id,
            'purchase_date' => '2026-01-10',
            'quantity' => 10,
            'remaining_qty' => 10,
            'unit_cost' => 15000,
        ]);

        // Sell 8: 5 from batch 1 @ 13000, 3 from batch 2 @ 15000
        $result = $this->engine->calculateCOGS($product, 8);

        $expectedCOGS = (5 * 13000) + (3 * 15000); // 65000 + 45000 = 110000
        $this->assertEquals($expectedCOGS, $result['cogs']);
        $this->assertCount(2, $result['batches_consumed']);
        $this->assertEquals(5, $result['batches_consumed'][0]['quantity']);
        $this->assertEquals(3, $result['batches_consumed'][1]['quantity']);
    }

    public function test_fifo_consumes_oldest_batch_first(): void
    {
        $product = Product::create([
            'code' => 'PRD-003',
            'name' => 'Tepung Terigu',
            'sell_price' => 12000,
            'cogs_method' => COGSMethod::FIFO,
            'stock' => 20,
            'average_cost' => 10000,
        ]);

        $batch1 = ProductBatch::create([
            'product_id' => $product->id,
            'purchase_date' => '2026-01-01',
            'quantity' => 10,
            'remaining_qty' => 10,
            'unit_cost' => 9000,
        ]);

        $batch2 = ProductBatch::create([
            'product_id' => $product->id,
            'purchase_date' => '2026-01-15',
            'quantity' => 10,
            'remaining_qty' => 10,
            'unit_cost' => 11000,
        ]);

        $result = $this->engine->calculateCOGS($product, 3);

        // Should use the oldest batch (batch1) first
        $this->assertEquals($batch1->id, $result['batches_consumed'][0]['batch_id']);
        $this->assertEquals(9000, $result['batches_consumed'][0]['unit_cost']);
    }

    // ═══════════ Average Method ═══════════

    public function test_average_method_uses_average_cost(): void
    {
        $product = Product::create([
            'code' => 'PRD-004',
            'name' => 'Beras 5kg',
            'sell_price' => 65000,
            'cogs_method' => COGSMethod::AVERAGE,
            'stock' => 20,
            'average_cost' => 55000,
        ]);

        $result = $this->engine->calculateCOGS($product, 5);

        $this->assertEquals('AVERAGE', $result['method']);
        $this->assertEquals(275000, $result['cogs']); // 5 × 55000
        $this->assertEquals(55000, $result['unit_cogs']);
        $this->assertEmpty($result['batches_consumed']); // Average doesn't track batches
    }

    // ═══════════ Stock Validation ═══════════

    public function test_insufficient_stock_throws_exception(): void
    {
        $product = Product::create([
            'code' => 'PRD-005',
            'name' => 'Sabun Mandi',
            'sell_price' => 5000,
            'cogs_method' => COGSMethod::FIFO,
            'stock' => 3,
            'average_cost' => 4000,
        ]);

        $this->expectException(\InvalidArgumentException::class);
        $this->engine->calculateCOGS($product, 5);
    }

    // ═══════════ receiveStock ═══════════

    public function test_receive_stock_updates_quantity_and_average(): void
    {
        $product = Product::create([
            'code' => 'PRD-006',
            'name' => 'Kopi',
            'sell_price' => 25000,
            'cogs_method' => COGSMethod::AVERAGE,
            'stock' => 10,
            'average_cost' => 20000,
        ]);

        $batch = $this->engine->receiveStock($product, 10, 22000, 'Supplier A');

        $product->refresh();
        $this->assertEquals(20, $product->stock);
        // New average = (10 × 20000 + 10 × 22000) / 20 = 420000 / 20 = 21000
        $this->assertEquals(21000, $product->average_cost);
        $this->assertEquals('Supplier A', $batch->supplier);
    }

    public function test_receive_stock_first_batch(): void
    {
        $product = Product::create([
            'code' => 'PRD-007',
            'name' => 'Kecap',
            'sell_price' => 10000,
            'cogs_method' => COGSMethod::AVERAGE,
            'stock' => 0,
            'average_cost' => 0,
        ]);

        $this->engine->receiveStock($product, 20, 8000);

        $product->refresh();
        $this->assertEquals(20, $product->stock);
        $this->assertEquals(8000, $product->average_cost);
    }

    // ═══════════ deductStock ═══════════

    public function test_deduct_stock_reduces_quantity(): void
    {
        $product = Product::create([
            'code' => 'PRD-008',
            'name' => 'Indomie',
            'sell_price' => 3500,
            'cogs_method' => COGSMethod::FIFO,
            'stock' => 50,
            'average_cost' => 2800,
        ]);

        ProductBatch::create([
            'product_id' => $product->id,
            'purchase_date' => '2026-01-01',
            'quantity' => 50,
            'remaining_qty' => 50,
            'unit_cost' => 2800,
        ]);

        $cogs = $this->engine->deductStock($product, 10);

        $product->refresh();
        $this->assertEquals(40, $product->stock);
        $this->assertEquals(28000, $cogs); // 10 × 2800
    }
}
