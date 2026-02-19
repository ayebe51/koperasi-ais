<?php

namespace App\Http\Controllers\Store;

use App\Enums\ReferenceType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Store\SaleRequest;
use App\Http\Requests\Store\StoreProductRequest;
use App\Http\Resources\ProductResource;
use App\Http\Traits\ApiResponse;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Services\Accounting\JournalService;
use App\Services\Store\COGSEngine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StoreController extends Controller
{
    use ApiResponse;

    public function __construct(
        private COGSEngine $cogsEngine,
        private JournalService $journalService
    ) {
    }

    // ═══════════ PRODUCTS ═══════════

    /**
     * GET /api/store/products
     */
    public function productIndex(Request $request): JsonResponse
    {
        $query = Product::query();

        if ($request->has('category'))
            $query->where('category', $request->category);
        if ($request->has('search')) {
            $query->where(
                fn($q) =>
                $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('code', 'like', "%{$request->search}%")
            );
        }
        if ($request->boolean('active_only', true))
            $query->where('is_active', true);

        $products = $query->orderBy('name')->paginate($request->per_page ?? 15);

        return ProductResource::collection($products)->response();
    }

    /**
     * POST /api/store/products
     */
    public function productStore(StoreProductRequest $request): JsonResponse
    {
        $product = Product::create($request->validated());
        return $this->created(new ProductResource($product), 'Produk berhasil ditambahkan');
    }

    /**
     * PUT /api/store/products/{id}
     */
    public function productUpdate(Request $request, string $id): JsonResponse
    {
        $product = Product::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'category' => 'nullable|string',
            'unit' => 'nullable|string|max:20',
            'sell_price' => 'sometimes|numeric|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        $product->update($validated);
        return $this->success(new ProductResource($product->fresh()), 'Produk berhasil diperbarui');
    }

    /**
     * POST /api/store/products/{id}/receive
     */
    public function productReceive(Request $request, string $id): JsonResponse
    {
        $product = Product::findOrFail($id);

        $request->validate([
            'quantity' => 'required|integer|min:1',
            'unit_cost' => 'required|numeric|min:0',
            'supplier' => 'nullable|string|max:255',
        ]);

        try {
            $batch = $this->cogsEngine->receiveStock(
                $product,
                (int) $request->quantity,
                (float) $request->unit_cost,
                $request->supplier
            );

            // Auto-journal: Persediaan (D) / Kas (K)
            $totalCost = $request->quantity * $request->unit_cost;
            $this->journalService->createJournal([
                'date' => now()->toDateString(),
                'description' => "Pembelian {$product->name} ({$request->quantity} {$product->unit})",
                'lines' => [
                    ['account_code' => '1-1400', 'debit' => $totalCost, 'credit' => 0, 'description' => 'Persediaan Barang'],
                    ['account_code' => '1-1100', 'debit' => 0, 'credit' => $totalCost, 'description' => 'Pembayaran'],
                ],
                'reference_type' => ReferenceType::PURCHASE,
                'reference_id' => $batch->id,
                'auto_post' => true,
            ]);

            return $this->created([
                'batch' => $batch,
                'product' => new ProductResource($product->fresh()),
            ], 'Stok berhasil diterima');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    // ═══════════ SALES ═══════════

    /**
     * POST /api/store/sales
     */
    public function saleStore(SaleRequest $request): JsonResponse
    {
        try {
            $sale = DB::transaction(function () use ($request) {
                $subtotal = 0;
                $totalCogs = 0;
                $saleItems = [];

                foreach ($request->items as $item) {
                    $product = Product::findOrFail($item['product_id']);
                    $price = $item['sell_price'] ?? $product->sell_price;
                    $itemSubtotal = (float) $price * $item['quantity'];
                    $itemCogs = $this->cogsEngine->deductStock($product, $item['quantity']);

                    $subtotal += $itemSubtotal;
                    $totalCogs += $itemCogs;

                    $saleItems[] = [
                        'product_id' => $product->id,
                        'quantity' => $item['quantity'],
                        'unit_price' => $price,
                        'subtotal' => $itemSubtotal,
                        'cogs' => $itemCogs,
                    ];
                }

                $discount = (float) ($request->discount ?? 0);
                $total = $subtotal - $discount;

                $sale = Sale::create([
                    'sale_number' => $this->generateSaleNumber(),
                    'sale_date' => now()->toDateString(),
                    'member_id' => $request->member_id,
                    'subtotal' => $subtotal,
                    'discount' => $discount,
                    'total' => $total,
                    'total_cogs' => $totalCogs,
                    'payment_method' => $request->payment_method ?? 'CASH',
                    'created_by' => $request->user()->id,
                ]);

                foreach ($saleItems as $item) {
                    SaleItem::create(['sale_id' => $sale->id, ...$item]);
                }

                // Auto-journal: Kas (D) + HPP (D) / Penjualan (K) + Persediaan (K)
                $journalLines = [
                    ['account_code' => '1-1100', 'debit' => $total, 'credit' => 0, 'description' => 'Penerimaan Kas Penjualan'],
                    ['account_code' => '4-1400', 'debit' => 0, 'credit' => $total, 'description' => 'Pendapatan Penjualan Toko'],
                ];

                if ($totalCogs > 0) {
                    $journalLines[] = ['account_code' => '5-1100', 'debit' => $totalCogs, 'credit' => 0, 'description' => 'Harga Pokok Penjualan'];
                    $journalLines[] = ['account_code' => '1-1400', 'debit' => 0, 'credit' => $totalCogs, 'description' => 'Pengurangan Persediaan'];
                }

                $journal = $this->journalService->createJournal([
                    'date' => now()->toDateString(),
                    'description' => "Penjualan Toko {$sale->sale_number}",
                    'lines' => $journalLines,
                    'reference_type' => ReferenceType::SALE,
                    'reference_id' => $sale->id,
                    'created_by' => $request->user()->id,
                    'auto_post' => true,
                ]);

                $sale->update(['journal_entry_id' => $journal->id]);

                return $sale->load('items.product');
            });

            return $this->created($sale, 'Penjualan berhasil');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * GET /api/store/sales
     */
    public function saleIndex(Request $request): JsonResponse
    {
        $query = Sale::with(['items.product', 'member', 'creator']);

        if ($request->has('start_date'))
            $query->where('sale_date', '>=', $request->start_date);
        if ($request->has('end_date'))
            $query->where('sale_date', '<=', $request->end_date);

        return $this->paginated($query->orderByDesc('sale_date')->paginate($request->per_page ?? 15));
    }

    /**
     * GET /api/store/sales/{id}
     */
    public function saleShow(string $id): JsonResponse
    {
        $sale = Sale::with(['items.product', 'member', 'creator', 'journalEntry.lines.account'])->findOrFail($id);
        return $this->success($sale);
    }

    private function generateSaleNumber(): string
    {
        $date = now()->format('Ymd');
        $last = Sale::where('sale_number', 'like', "SL-{$date}-%")
            ->orderByDesc('sale_number')
            ->first();

        $seq = 1;
        if ($last) {
            $parts = explode('-', $last->sale_number);
            $seq = (int) end($parts) + 1;
        }

        return sprintf("SL-%s-%04d", $date, $seq);
    }
}
