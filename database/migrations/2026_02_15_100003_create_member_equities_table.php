<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('member_equities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('member_id')->unique();
            $table->decimal('simpanan_pokok', 15, 2)->default(0);
            $table->decimal('simpanan_wajib', 15, 2)->default(0);
            $table->decimal('modal_penyertaan', 15, 2)->default(0);
            $table->decimal('shu_belum_dibagikan', 15, 2)->default(0);
            $table->decimal('shu_tahun_berjalan', 15, 2)->default(0);
            $table->decimal('total_ekuitas', 15, 2)->default(0);
            $table->timestamps();

            $table->foreign('member_id')->references('id')->on('members')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('member_equities');
    }
};
