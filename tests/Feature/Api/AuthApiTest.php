<?php

namespace Tests\Feature\Api;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    // ═══════════ LOGIN ═══════════

    public function test_login_with_valid_credentials(): void
    {
        $user = User::factory()->create([
            'role' => UserRole::ADMIN,
            'password' => bcrypt('secret123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'secret123',
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => ['user' => ['id', 'name', 'email', 'role'], 'token'],
            ])
            ->assertJson(['success' => true]);
    }

    public function test_login_with_wrong_password(): void
    {
        $user = User::factory()->create(['password' => bcrypt('correct')]);

        $response = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'wrong',
        ]);

        $response->assertUnauthorized()
            ->assertJson(['success' => false]);
    }

    public function test_login_validation_errors(): void
    {
        $response = $this->postJson('/api/auth/login', []);

        $response->assertUnprocessable();
    }

    // ═══════════ REGISTER ═══════════

    public function test_register_creates_member_role(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Budi Test',
            'email' => 'budi@test.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertCreated()
            ->assertJson([
                'success' => true,
                'data' => ['user' => ['role' => 'MEMBER']],
            ]);
    }

    public function test_register_duplicate_email(): void
    {
        User::factory()->create(['email' => 'taken@test.com']);

        $response = $this->postJson('/api/auth/register', [
            'name' => 'Another',
            'email' => 'taken@test.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertUnprocessable();
    }

    // ═══════════ LOGOUT ═══════════

    public function test_logout_revokes_token(): void
    {
        $user = User::factory()->create(['role' => UserRole::ADMIN]);
        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/auth/logout');

        $response->assertOk()
            ->assertJson(['success' => true]);

        // Token should be revoked
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    // ═══════════ ME ═══════════

    public function test_me_returns_user_profile(): void
    {
        $user = User::factory()->create(['role' => UserRole::ADMIN]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/auth/me');

        $response->assertOk()
            ->assertJsonPath('data.email', $user->email);
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        $response = $this->getJson('/api/auth/me');

        $response->assertUnauthorized();
    }
}
