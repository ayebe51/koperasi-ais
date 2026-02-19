<?php

namespace Tests\Feature\Api;

use App\Enums\UserRole;
use App\Models\ChartOfAccount;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StoreApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => UserRole::ADMIN]);
        $this->seedCOA();
    }

    private function seedCOA(): void
    {
        ChartOfAccount::create(['code' => '1-1100', 'name' => 'Kas', 'category' => 'ASSET', 'normal_balance' => 'DEBIT']);
        ChartOfAccount::create(['code' => '1-1400', 'name' => 'Persediaan', 'category' => 'ASSET', 'normal_balance' => 'DEBIT']);
        ChartOfAccount::create(['code' => '4-1400', 'name' => 'Penjualan Toko', 'category' => 'REVENUE', 'normal_balance' => 'CREDIT']);
        ChartOfAccount::create(['code' => '5-1100', 'name' => 'HPP', 'category' => 'EXPENSE', 'normal_balance' => 'DEBIT']);
    }

    // ═══════════ PRODUCTS ═══════════

    public function test_create_product(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/store/products', [
                'code' => 'PRD-001',
                'name' => 'Pensil 2B',
                'sell_price' => 5000,
                'cogs_method' => 'FIFO',
            ]);

        $response->assertCreated()
            ->assertJson(['success' => true])
            ->assertJsonPath('data.code', 'PRD-001');
    }

    public function test_create_product_duplicate_code(): void
    {
        Product::create([
            'code' => 'PRD-001',
            'name' => 'Existing',
            'sell_price' => 5000,
            'cogs_method' => 'FIFO',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/store/products', [
                'code' => 'PRD-001',
                'name' => 'Duplicate',
                'sell_price' => 3000,
                'cogs_method' => 'FIFO',
            ]);

        $response->assertUnprocessable();
    }

    public function test_list_products(): void
    {
        Product::create(['code' => 'PRD-001', 'name' => 'Pensil', 'sell_price' => 5000, 'cogs_method' => 'FIFO']);
        Product::create(['code' => 'PRD-002', 'name' => 'Penghapus', 'sell_price' => 3000, 'cogs_method' => 'AVERAGE']);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/store/products');

        $response->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_search_products(): void
    {
        Product::create(['code' => 'PRD-001', 'name' => 'Pensil 2B', 'sell_price' => 5000, 'cogs_method' => 'FIFO']);
        Product::create(['code' => 'PRD-002', 'name' => 'Penghapus', 'sell_price' => 3000, 'cogs_method' => 'AVERAGE']);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/store/products?search=Pensil');

        $response->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_update_product(): void
    {
        $product = Product::create([
            'code' => 'PRD-001',
            'name' => 'Old Name',
            'sell_price' => 5000,
            'cogs_method' => 'FIFO',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/store/products/{$product->id}", [
                'name' => 'New Name',
                'sell_price' => 7000,
            ]);

        $response->assertOk()
            ->assertJsonPath('data.name', 'New Name')
            ->assertJsonPath('data.sell_price', 7000);
    }

    // ═══════════ RECEIVE STOCK ═══════════

    public function test_receive_stock(): void
    {
        $product = Product::create([
            'code' => 'PRD-001',
            'name' => 'Pensil',
            'sell_price' => 5000,
            'cogs_method' => 'FIFO',
            'stock' => 0,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/store/products/{$product->id}/receive", [
                'quantity' => 100,
                'unit_cost' => 3000,
                'supplier' => 'PT Pena Jaya',
            ]);

        $response->assertCreated()
            ->assertJson(['success' => true]);

        $product->refresh();
        $this->assertEquals(100, $product->stock);
    }

    // ═══════════ RBAC ═══════════

    public function test_member_cannot_manage_products(): void
    {
        $member = User::factory()->create(['role' => UserRole::MEMBER]);

        $response = $this->actingAs($member, 'sanctum')
            ->getJson('/api/store/products');

        $response->assertForbidden();
    }

    public function test_accountant_cannot_manage_store(): void
    {
        $accountant = User::factory()->create(['role' => UserRole::ACCOUNTANT]);

        $response = $this->actingAs($accountant, 'sanctum')
            ->postJson('/api/store/products', [
                'code' => 'PRD-999',
                'name' => 'Hack Product',
                'sell_price' => 1,
                'cogs_method' => 'FIFO',
            ]);

        $response->assertForbidden();
    }
}
