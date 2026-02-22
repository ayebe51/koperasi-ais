<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('loans', function (Blueprint $table) {
            $table->foreignId('manager_approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('manager_approved_at')->nullable();

            $table->foreignId('chairman_approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('chairman_approved_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('loans', function (Blueprint $table) {
            $table->dropForeign(['manager_approved_by']);
            $table->dropColumn(['manager_approved_by', 'manager_approved_at']);

            $table->dropForeign(['chairman_approved_by']);
            $table->dropColumn(['chairman_approved_by', 'chairman_approved_at']);
        });
    }
};
