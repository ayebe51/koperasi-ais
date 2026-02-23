<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('bank_mutations', function (Blueprint $table) {
            $table->id();
            $table->date('transaction_date');
            $table->text('description');
            $table->decimal('amount', 15, 2);
            $table->enum('type', ['DEBIT', 'CREDIT']);
            $table->decimal('balance_after', 15, 2)->nullable();
            $table->string('bank_name')->default('BCA');
            $table->string('reference_id')->nullable()->index();
            $table->string('status')->default('PENDING'); // PENDING, RECONCILED, IGNORED

            // Linking to internal systems
            $table->string('reconciled_to_type')->nullable(); // 'loan_payment', 'saving_deposit', etc.
            $table->unsignedBigInteger('reconciled_to_id')->nullable();
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bank_mutations');
    }
};
