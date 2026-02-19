<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('ckpn_provisions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('loan_id');
            $table->date('period');
            $table->string('collectibility'); // Collectibility enum
            $table->decimal('outstanding_balance', 15, 2);
            $table->decimal('provision_rate', 5, 4);
            $table->decimal('provision_amount', 15, 2);
            $table->uuid('journal_entry_id')->nullable();
            $table->timestamps();

            $table->foreign('loan_id')->references('id')->on('loans')->cascadeOnDelete();
            $table->index(['loan_id', 'period']);
            $table->index('period');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ckpn_provisions');
    }
};
