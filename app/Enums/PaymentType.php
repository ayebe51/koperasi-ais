<?php

namespace App\Enums;

enum PaymentType: string
{
    case SIMPANAN_POKOK = 'SIMPANAN_POKOK';
    case SIMPANAN_WAJIB = 'SIMPANAN_WAJIB';
    case SIMPANAN_SUKARELA = 'SIMPANAN_SUKARELA';
    case ANGSURAN_PINJAMAN = 'ANGSURAN_PINJAMAN';

    /**
     * Map PaymentType to SavingType value for deposit processing
     */
    public function toSavingType(): ?string
    {
        return match ($this) {
            self::SIMPANAN_POKOK => 'POKOK',
            self::SIMPANAN_WAJIB => 'WAJIB',
            self::SIMPANAN_SUKARELA => 'SUKARELA',
            self::ANGSURAN_PINJAMAN => null,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::SIMPANAN_POKOK => 'Simpanan Pokok',
            self::SIMPANAN_WAJIB => 'Simpanan Wajib',
            self::SIMPANAN_SUKARELA => 'Simpanan Sukarela',
            self::ANGSURAN_PINJAMAN => 'Angsuran Pinjaman',
        };
    }
}
