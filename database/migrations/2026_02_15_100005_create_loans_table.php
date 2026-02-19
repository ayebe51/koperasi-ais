<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('loans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('loan_number')->unique();
            $table->uuid('member_id');
            $table->decimal('principal_amount', 15, 2);
            $table->decimal('interest_rate', 5, 2); // Nominal rate (% per year)
            $table->integer('term_months');
            $table->decimal('amortized_cost', 15, 2)->default(0); // SAK EP: carrying amount
            $table->decimal('effective_interest_rate', 8, 6)->default(0); // EIR
            $table->decimal('administration_fee', 15, 2)->default(0);
            $table->decimal('provision_fee', 15, 2)->default(0);
            $table->decimal('monthly_payment', 15, 2)->default(0);
            $table->date('loan_date');
            $table->date('due_date');
            $table->string('status')->default('PENDING'); // LoanStatus enum
            $table->string('collectibility')->default('LANCAR'); // Collectibility enum
            $table->string('purpose')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->foreign('member_id')->references('id')->on('members')->cascadeOnDelete();
            $table->index(['member_id', 'status']);
            $table->index('collectibility');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loans');
    }
};
