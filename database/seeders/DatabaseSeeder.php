<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        // Seed Chart of Accounts
        $this->call(ChartOfAccountSeeder::class);

        // Create default admin user
        User::factory()->create([
            'name' => 'Admin Koperasi',
            'email' => 'admin@koperasi.test',
            'role' => UserRole::ADMIN,
        ]);

        // Create teller user
        User::factory()->create([
            'name' => 'Teller Koperasi',
            'email' => 'teller@koperasi.test',
            'role' => UserRole::TELLER,
        ]);

        // Seed demo data (members, savings, loans, products, sales)
        $this->call(DemoSeeder::class);
    }
}
