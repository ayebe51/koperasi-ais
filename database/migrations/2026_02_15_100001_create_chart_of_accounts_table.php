<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('chart_of_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('category'); // AccountCategory enum
            $table->string('normal_balance'); // BalanceType enum
            $table->uuid('parent_id')->nullable();
            $table->boolean('is_cooperative_specific')->default(false);
            $table->string('report_section')->nullable(); // ReportSection enum
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('code');
        });

        // Self-referencing FK must be added after table creation
        Schema::table('chart_of_accounts', function (Blueprint $table) {
            $table->foreign('parent_id')->references('id')->on('chart_of_accounts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chart_of_accounts');
    }
};
