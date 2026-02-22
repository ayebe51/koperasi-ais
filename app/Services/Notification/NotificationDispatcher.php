<?php

namespace App\Services\Notification;

use App\Models\LoanSchedule;
use Illuminate\Support\Facades\Notification;
use App\Notifications\LoanDueReminder;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Carbon;

class NotificationDispatcher
{
    public function __construct(
        protected FonnteService $fonnteService
    ) {
    }

    /**
     * Dispatch due reminder to a member for a specific loan schedule.
     */
    public function sendDueReminder(LoanSchedule $schedule): bool
    {
        $member = $schedule->loan->member;
        $success = false;

        $message = $this->buildWhatsAppMessage($schedule);

        // 1. WhatsApp (Primary, if enabled)
        if (env('ENABLE_WHATSAPP', true) && !empty($member->phone)) {
            $waSuccess = $this->fonnteService->sendMessage($member->phone, $message);
            if ($waSuccess) {
                $success = true;
                Log::info("WhatsApp reminder sent to {$member->name} ({$member->phone}) for loan {$schedule->loan->loan_number}");
            }
        }

        // 2. Email (Fallback or concurrent, if enabled)
        if (env('ENABLE_EMAIL', true) && !empty($member->user?->email)) {
            try {
                // Send Laravel Notification to the Member's User account
                $member->user->notify(new LoanDueReminder($schedule));
                $success = true;
                Log::info("Email reminder sent to {$member->name} ({$member->user->email}) for loan {$schedule->loan->loan_number}");
            } catch (\Exception $e) {
                Log::error("Failed to send Email reminder to {$member->name}: " . $e->getMessage());
            }
        }

        return $success;
    }

    private function buildWhatsAppMessage(LoanSchedule $schedule): string
    {
        $member = $schedule->loan->member;
        $loan = $schedule->loan;
        $dueDate = Carbon::parse($schedule->due_date)->format('d M Y');
        $amount = 'Rp ' . number_format((float) $schedule->total_amount, 0, ',', '.');

        $isOverdue = Carbon::parse($schedule->due_date)->isPast();
        $greeting = "Halo Bpk/Ibu *{$member->name}*,";

        if ($isOverdue) {
            $status = "telah *MELEWATI JATUH TEMPO* pada {$dueDate}";
        } else if (Carbon::parse($schedule->due_date)->isToday()) {
            $status = "jatuh tempo *HARI INI* ({$dueDate})";
        } else {
            $status = "akan jatuh tempo pada *{$dueDate}*";
        }

        return <<<WA
{$greeting}

Ini adalah pesan pengingat otomatis dari *Koperasi AIS*.

Tagihan pinjaman Anda (Pinjaman no: {$loan->loan_number}) untuk angsuran ke-{$schedule->installment_number} {$status}.

*Total Tagihan:* {$amount}

Mohon segera melakukan pembayaran melalui transfer bank atau scan QRIS di aplikasi/portal anggota untuk menghindari denda keterlambatan. Jika sudah membayar, mohon abaikan pesan ini.

Terima kasih,
*Pengurus Koperasi AIS*
WA;
    }
}
