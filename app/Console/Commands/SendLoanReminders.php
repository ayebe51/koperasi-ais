<?php

namespace App\Console\Commands;

use App\Models\LoanSchedule;
use App\Services\Notification\NotificationDispatcher;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class SendLoanReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'loans:send-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send automated WhatsApp/Email reminders for loan installments due today or in 3 days';

    /**
     * Execute the console command.
     */
    public function handle(NotificationDispatcher $dispatcher)
    {
        $this->info('Starting loan due date reminder check...');

        $today = Carbon::today()->toDateString();
        $inThreeDays = Carbon::today()->addDays(3)->toDateString();

        $schedules = LoanSchedule::with(['loan.member.user'])
            ->where('is_paid', false)
            ->whereNull('reminder_sent_at')
            ->whereIn('due_date', [$today, $inThreeDays])
            ->get();

        $count = 0;
        foreach ($schedules as $schedule) {
            /** @var \App\Models\LoanSchedule $schedule */
            $success = $dispatcher->sendDueReminder($schedule);

            if ($success) {
                $schedule->update(['reminder_sent_at' => now()]);
                $count++;
            }
        }

        $this->info("Completed. Successfully sent {$count} reminders.");
        return 0;
    }
}

