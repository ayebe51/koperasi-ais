<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('members', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('member_number')->unique();
            $table->string('nik')->unique();
            $table->string('nuptk')->nullable();
            $table->string('name');
            $table->string('unit_kerja'); // Sekolah/Madrasah
            $table->string('jabatan')->nullable();
            $table->string('status_karyawan')->nullable(); // PNS/Honorer
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            $table->string('email')->nullable();
            $table->date('join_date');
            $table->string('status')->default('ACTIVE'); // MemberStatus enum
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'unit_kerja']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('members');
    }
};
