<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('member_id')->constrained('members')->cascadeOnDelete();
            $table->string('payment_type');          // PaymentType enum
            $table->decimal('amount', 15, 2);
            $table->string('status')->default('PENDING'); // PaymentStatus enum

            // Midtrans fields
            $table->string('midtrans_order_id')->unique();
            $table->string('midtrans_transaction_id')->nullable();
            $table->text('qris_url')->nullable();
            $table->text('qris_string')->nullable();

            // Optional references
            $table->foreignUuid('loan_id')->nullable()->constrained('loans')->nullOnDelete();
            $table->string('saving_type')->nullable(); // POKOK, WAJIB, SUKARELA
            $table->foreignUuid('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();

            // Timestamps
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('expired_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('status');
            $table->index('member_id');
            $table->index('payment_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
