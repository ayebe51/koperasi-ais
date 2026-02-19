<?php

namespace Tests\Feature\Api;

use App\Enums\MemberStatus;
use App\Enums\UserRole;
use App\Models\Member;
use App\Models\MemberEquity;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MemberApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $teller;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => UserRole::ADMIN]);
        $this->teller = User::factory()->create(['role' => UserRole::TELLER]);
    }

    // ═══════════ INDEX ═══════════

    public function test_list_members(): void
    {
        $this->createMember('M-001', 'Ahmad Fauzi');
        $this->createMember('M-002', 'Siti Aminah');

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/members');

        $response->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_search_members_by_name(): void
    {
        $this->createMember('M-001', 'Ahmad Fauzi');
        $this->createMember('M-002', 'Siti Aminah');

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/members?search=Ahmad');

        $response->assertOk()
            ->assertJsonCount(1, 'data');
    }

    // ═══════════ STORE ═══════════

    public function test_create_member(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/members', [
                'member_number' => 'M-NEW-001',
                'nik' => '3301010101010001',
                'name' => 'Budi Santoso',
                'unit_kerja' => 'MI Maarif 01',
                'join_date' => '2026-01-01',
            ]);

        $response->assertCreated()
            ->assertJson(['success' => true])
            ->assertJsonPath('data.name', 'Budi Santoso');

        $this->assertDatabaseHas('members', ['member_number' => 'M-NEW-001']);
        $this->assertDatabaseHas('member_equities', []);
    }

    public function test_create_member_validation_nik_size(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/members', [
                'member_number' => 'M-001',
                'nik' => '123', // too short
                'name' => 'Test',
                'unit_kerja' => 'Unit',
                'join_date' => '2026-01-01',
            ]);

        $response->assertUnprocessable();
    }

    public function test_create_member_duplicate_nik(): void
    {
        $this->createMember('M-001', 'Existing', '3301010101010001');

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/members', [
                'member_number' => 'M-002',
                'nik' => '3301010101010001', // duplicate
                'name' => 'New Member',
                'unit_kerja' => 'Unit',
                'join_date' => '2026-01-01',
            ]);

        $response->assertUnprocessable();
    }

    // ═══════════ SHOW ═══════════

    public function test_show_member_detail(): void
    {
        $member = $this->createMember('M-001', 'Ahmad Fauzi');

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/members/{$member->id}");

        $response->assertOk()
            ->assertJsonPath('data.member.name', 'Ahmad Fauzi');
    }

    public function test_show_nonexistent_member_returns_404(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/members/00000000-0000-0000-0000-000000000000');

        $response->assertNotFound();
    }

    // ═══════════ UPDATE ═══════════

    public function test_update_member(): void
    {
        $member = $this->createMember('M-001', 'Old Name');

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/members/{$member->id}", [
                'name' => 'New Name',
                'phone' => '081234567890',
            ]);

        $response->assertOk()
            ->assertJsonPath('data.name', 'New Name');
    }

    // ═══════════ DELETE ═══════════

    public function test_delete_member_soft_deletes(): void
    {
        $member = $this->createMember('M-001', 'To Delete');

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/members/{$member->id}");

        $response->assertOk();
        $this->assertSoftDeleted('members', ['id' => $member->id]);
    }

    // ═══════════ RBAC ═══════════

    public function test_member_role_cannot_access_members(): void
    {
        $memberUser = User::factory()->create(['role' => UserRole::MEMBER]);

        $response = $this->actingAs($memberUser, 'sanctum')
            ->getJson('/api/members');

        $response->assertForbidden();
    }

    public function test_teller_can_access_members(): void
    {
        $response = $this->actingAs($this->teller, 'sanctum')
            ->getJson('/api/members');

        $response->assertOk();
    }

    // ═══════════ Helper ═══════════

    private function createMember(string $number, string $name, string $nik = null): Member
    {
        $member = Member::create([
            'member_number' => $number,
            'nik' => $nik ?? fake()->numerify('################'),
            'name' => $name,
            'unit_kerja' => 'Test Unit',
            'status' => MemberStatus::ACTIVE,
            'join_date' => '2026-01-01',
        ]);
        MemberEquity::create(['member_id' => $member->id]);
        return $member;
    }
}
