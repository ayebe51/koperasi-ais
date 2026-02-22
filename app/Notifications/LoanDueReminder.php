<?php

namespace App\Notifications;

use App\Models\LoanSchedule;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class LoanDueReminder extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public LoanSchedule $schedule
    ) {
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $member = $this->schedule->loan->member;
        $loanNumber = $this->schedule->loan->loan_number;
        $installment = $this->schedule->installment_number;
        $dueDate = \Illuminate\Support\Carbon::parse($this->schedule->due_date)->format('d M Y');
        $amount = 'Rp ' . number_format((float) $this->schedule->total_amount, 0, ',', '.');

        $isOverdue = \Illuminate\Support\Carbon::parse($this->schedule->due_date)->isPast();
        $status = $isOverdue ? 'Telah melewati jatuh tempo' : 'Akan jatuh tempo';

        return (new MailMessage)
            ->subject("Pengingat: Tagihan Pinjaman {$loanNumber} - Koperasi AIS")
            ->greeting("Halo Bpk/Ibu {$member->name},")
            ->line("Ini adalah pengingat otomatis bahwa tagihan pinjaman Anda (Pinjaman no: {$loanNumber}) untuk angsuran ke-{$installment} {$status}.")
            ->line("**Total Tagihan:** {$amount}")
            ->line("**Jatuh Tempo:** {$dueDate}")
            ->line("Mohon segera melakukan pembayaran memalui portal anggota untuk menghindari denda keterlambatan.")
            ->action('Bayar Sekarang via Portal', url('/portal'))
            ->line("Jika Anda sudah melakukan pembayaran hari ini, abaikan email ini.")
            ->line('Terima kasih atas partisipasi aktif Anda di Koperasi AIS.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            //
        ];
    }
}
