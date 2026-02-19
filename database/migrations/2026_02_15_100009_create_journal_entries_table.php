<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('journal_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('entry_number')->unique();
            $table->date('entry_date');
            $table->date('transaction_date');
            $table->timestamp('posting_date')->nullable();
            $table->boolean('is_posted')->default(false);
            $table->text('description');
            $table->string('reference_type')->nullable(); // ReferenceType enum
            $table->string('reference_id')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->boolean('is_reversed')->default(false);
            $table->uuid('reversal_of')->nullable();
            $table->timestamps();

            $table->index(['entry_date', 'is_posted']);
            $table->index(['reference_type', 'reference_id']);
        });

        // Self-referencing FK must be added after table creation
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->foreign('reversal_of')->references('id')->on('journal_entries')->nullOnDelete();
        });

        Schema::create('journal_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('journal_entry_id');
            $table->uuid('account_id');
            $table->decimal('debit', 15, 2)->default(0);
            $table->decimal('credit', 15, 2)->default(0);
            $table->string('description')->nullable();
            $table->timestamps();

            $table->foreign('journal_entry_id')->references('id')->on('journal_entries')->cascadeOnDelete();
            $table->foreign('account_id')->references('id')->on('chart_of_accounts')->restrictOnDelete();
            $table->index('journal_entry_id');
            $table->index('account_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journal_lines');
        Schema::dropIfExists('journal_entries');
    }
};
