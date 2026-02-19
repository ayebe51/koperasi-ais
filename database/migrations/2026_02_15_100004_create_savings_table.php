<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('savings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('member_id');
            $table->string('type'); // SavingType enum
            $table->decimal('amount', 15, 2);
            $table->string('transaction_type'); // TransactionType enum
            $table->date('transaction_date');
            $table->decimal('balance', 15, 2); // Running balance after tx
            $table->string('description')->nullable();
            $table->string('reference_number')->nullable();
            $table->uuid('journal_entry_id')->nullable();
            $table->timestamps();

            $table->foreign('member_id')->references('id')->on('members')->cascadeOnDelete();
            $table->index(['member_id', 'type']);
            $table->index('transaction_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('savings');
    }
};
