<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('fiscal_periods', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->integer('year')->unique();
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_closed')->default(false);
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('shu_distributions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->integer('fiscal_year');
            $table->uuid('member_id');
            $table->decimal('jasa_simpanan', 15, 2)->default(0); // SHU from savings contribution
            $table->decimal('jasa_pinjaman', 15, 2)->default(0); // SHU from loan interest contribution
            $table->decimal('jasa_usaha', 15, 2)->default(0);    // SHU from business transactions
            $table->decimal('total_shu', 15, 2);
            $table->boolean('is_paid')->default(false);
            $table->date('paid_date')->nullable();
            $table->uuid('journal_entry_id')->nullable();
            $table->timestamps();

            $table->foreign('member_id')->references('id')->on('members')->cascadeOnDelete();
            $table->unique(['fiscal_year', 'member_id']);
            $table->index('fiscal_year');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shu_distributions');
        Schema::dropIfExists('fiscal_periods');
    }
};
