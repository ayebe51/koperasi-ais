<?php

namespace Tests\Feature\Api;

use App\Enums\MemberStatus;
use App\Enums\UserRole;
use App\Models\ChartOfAccount;
use App\Models\Loan;
use App\Models\Member;
use App\Models\MemberEquity;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => UserRole::ADMIN]);
    }

    public function test_dashboard_stats_response_structure(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/dashboard/stats');

        $response->assertOk()
            ->assertJson(['success' => true])
            ->assertJsonStructure([
                'data' => [
                    'anggota' => ['aktif', 'baru_bulan_ini'],
                    'simpanan' => ['pokok', 'wajib', 'sukarela', 'total'],
                    'pinjaman' => ['aktif', 'pending', 'outstanding'],
                    'toko' => ['total_produk', 'stok_rendah', 'penjualan_bulan_ini'],
                    'periode' => ['bulan', 'tanggal'],
                ],
            ]);
    }

    public function test_dashboard_counts_active_members(): void
    {
        $this->createMember('M-001', 'Active');
        $this->createMember('M-002', 'Active 2');

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/dashboard/stats');

        $response->assertOk()
            ->assertJsonPath('data.anggota.aktif', 2);
    }

    public function test_dashboard_counts_products(): void
    {
        Product::create(['code' => 'P1', 'name' => 'Product 1', 'sell_price' => 1000, 'cogs_method' => 'FIFO', 'stock' => 50]);
        Product::create(['code' => 'P2', 'name' => 'Product 2', 'sell_price' => 2000, 'cogs_method' => 'AVERAGE', 'stock' => 5]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/dashboard/stats');

        $response->assertOk()
            ->assertJsonPath('data.toko.total_produk', 2)
            ->assertJsonPath('data.toko.stok_rendah', 1); // stock <= 10
    }

    public function test_any_authenticated_user_can_access_stats(): void
    {
        $member = User::factory()->create(['role' => UserRole::MEMBER]);

        $response = $this->actingAs($member, 'sanctum')
            ->getJson('/api/dashboard/stats');

        $response->assertOk();
    }

    public function test_unauthenticated_cannot_access_stats(): void
    {
        $response = $this->getJson('/api/dashboard/stats');
        $response->assertUnauthorized();
    }

    private function createMember(string $number, string $name): Member
    {
        $member = Member::create([
            'member_number' => $number,
            'nik' => fake()->numerify('################'),
            'name' => $name,
            'unit_kerja' => 'Test Unit',
            'status' => MemberStatus::ACTIVE,
            'join_date' => now()->toDateString(),
        ]);
        MemberEquity::create(['member_id' => $member->id]);
        return $member;
    }
}
