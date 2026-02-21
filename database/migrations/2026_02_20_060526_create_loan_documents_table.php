<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('loan_documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('loan_id');
            $table->string('document_type'); // KTP, SLIP_GAJI, SURAT_PERMOHONAN, JAMINAN, LAINNYA
            $table->string('file_name');
            $table->string('file_path');
            $table->string('mime_type');
            $table->unsignedBigInteger('file_size'); // bytes
            $table->timestamps();

            $table->foreign('loan_id')->references('id')->on('loans')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loan_documents');
    }
};
