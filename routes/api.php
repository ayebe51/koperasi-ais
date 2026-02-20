<?php

use App\Http\Controllers\Accounting\AccountingController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Dashboard\DashboardController;
use App\Http\Controllers\Export\ExportController;
use App\Http\Controllers\Loan\LoanController;
use App\Http\Controllers\Member\MemberController;
use App\Http\Controllers\Payment\PaymentController;
use App\Http\Controllers\Portal\MemberPortalController;
use App\Http\Controllers\Receipt\ReceiptController;
use App\Http\Controllers\Report\ReportController;
use App\Http\Controllers\Saving\SavingController;
use App\Http\Controllers\Settings\SettingsController;
use App\Http\Controllers\ActivityLog\ActivityLogController;
use App\Http\Controllers\SHU\SHUController;
use App\Http\Controllers\Store\StoreController;
use App\Http\Controllers\User\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Koperasi AIS API Routes
|--------------------------------------------------------------------------
*/

// ═══════════ AUTH (Public) ═══════════
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/activate-member', [AuthController::class, 'activateMember']);
});

// ═══════════ PAYMENTS WEBHOOK (Public — verified by Midtrans signature) ═══════════
Route::post('/payments/webhook', [PaymentController::class, 'webhook']);

// ═══════════ PROTECTED ROUTES ═══════════
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::put('/auth/password', [AuthController::class, 'changePassword']);

    // ─── Members ───
    Route::prefix('members')->middleware('role:ADMIN,MANAGER,TELLER')->group(function () {
        Route::get('/', [MemberController::class, 'index']);
        Route::post('/', [MemberController::class, 'store']);
        Route::get('/{id}', [MemberController::class, 'show']);
        Route::put('/{id}', [MemberController::class, 'update']);
        Route::delete('/{id}', [MemberController::class, 'destroy'])
            ->middleware('role:ADMIN,MANAGER');
        Route::post('/{id}/create-account', [MemberController::class, 'createPortalAccount'])
            ->middleware('role:ADMIN,MANAGER');
    });

    // ─── Savings ───
    Route::prefix('savings')->middleware('role:ADMIN,MANAGER,TELLER')->group(function () {
        Route::get('/summary', [SavingController::class, 'summary']);
        Route::get('/', [SavingController::class, 'index']);
        Route::post('/deposit', [SavingController::class, 'deposit']);
        Route::post('/withdraw', [SavingController::class, 'withdraw']);
        Route::get('/balance/{memberId}', [SavingController::class, 'balance']);
    });

    // ─── Loans ───
    Route::prefix('loans')->group(function () {
        Route::get('/', [LoanController::class, 'index'])
            ->middleware('role:ADMIN,MANAGER,TELLER,ACCOUNTANT');
        Route::post('/apply', [LoanController::class, 'apply'])
            ->middleware('role:ADMIN,MANAGER,TELLER');
        Route::post('/simulate', [LoanController::class, 'simulate'])
            ->middleware('role:ADMIN,MANAGER,TELLER');
        Route::get('/{id}', [LoanController::class, 'show'])
            ->middleware('role:ADMIN,MANAGER,TELLER,ACCOUNTANT');
        Route::get('/{id}/schedule', [LoanController::class, 'schedule'])
            ->middleware('role:ADMIN,MANAGER,TELLER,ACCOUNTANT');
        Route::post('/{id}/approve', [LoanController::class, 'approve'])
            ->middleware('role:ADMIN,MANAGER');
        Route::post('/{id}/reject', [LoanController::class, 'reject'])
            ->middleware('role:ADMIN,MANAGER');
        Route::post('/{id}/pay', [LoanController::class, 'pay'])
            ->middleware('role:ADMIN,MANAGER,TELLER');
        Route::post('/ckpn', [LoanController::class, 'runCKPN'])
            ->middleware('role:ADMIN,ACCOUNTANT');
    });

    // ─── Accounting ───
    Route::prefix('accounting')->group(function () {
        // COA
        Route::get('/coa', [AccountingController::class, 'coaIndex'])
            ->middleware('role:ADMIN,MANAGER,ACCOUNTANT');
        Route::post('/coa', [AccountingController::class, 'coaStore'])
            ->middleware('role:ADMIN,ACCOUNTANT');
        Route::delete('/coa/{id}', [AccountingController::class, 'coaDestroy'])
            ->middleware('role:ADMIN,ACCOUNTANT');

        // Journals
        Route::get('/journals', [AccountingController::class, 'journalIndex'])
            ->middleware('role:ADMIN,MANAGER,ACCOUNTANT');
        Route::post('/journals', [AccountingController::class, 'journalStore'])
            ->middleware('role:ADMIN,ACCOUNTANT');
        Route::get('/journals/{id}', [AccountingController::class, 'journalShow'])
            ->middleware('role:ADMIN,MANAGER,ACCOUNTANT');
        Route::post('/journals/{id}/post', [AccountingController::class, 'journalPost'])
            ->middleware('role:ADMIN,ACCOUNTANT');
        Route::post('/journals/{id}/reverse', [AccountingController::class, 'journalReverse'])
            ->middleware('role:ADMIN,ACCOUNTANT');
        Route::delete('/journals/{id}', [AccountingController::class, 'journalDestroy'])
            ->middleware('role:ADMIN,ACCOUNTANT');

        // Ledger
        Route::get('/ledger/{accountCode}', [AccountingController::class, 'ledger'])
            ->middleware('role:ADMIN,MANAGER,ACCOUNTANT');

        // Reports
        Route::get('/trial-balance', [AccountingController::class, 'trialBalance'])
            ->middleware('role:ADMIN,MANAGER,ACCOUNTANT');
        Route::get('/reports/balance-sheet', [AccountingController::class, 'balanceSheet'])
            ->middleware('role:ADMIN,MANAGER,ACCOUNTANT');
        Route::get('/reports/income-statement', [AccountingController::class, 'incomeStatement'])
            ->middleware('role:ADMIN,MANAGER,ACCOUNTANT');
        Route::get('/reports/cash-flow', [AccountingController::class, 'cashFlow'])
            ->middleware('role:ADMIN,MANAGER,ACCOUNTANT');
    });

    // ─── Store ───
    Route::prefix('store')->middleware('role:ADMIN,MANAGER,TELLER')->group(function () {
        // Products
        Route::get('/products', [StoreController::class, 'productIndex']);
        Route::post('/products', [StoreController::class, 'productStore']);
        Route::put('/products/{id}', [StoreController::class, 'productUpdate']);
        Route::post('/products/{id}/receive', [StoreController::class, 'productReceive']);

        // Sales
        Route::get('/sales', [StoreController::class, 'saleIndex']);
        Route::post('/sales', [StoreController::class, 'saleStore']);
        Route::get('/sales/{id}', [StoreController::class, 'saleShow']);
    });

    // ─── SHU ───
    Route::prefix('shu')->group(function () {
        Route::get('/calculate/{year?}', [SHUController::class, 'calculate'])
            ->middleware('role:ADMIN,MANAGER');
        Route::post('/distribute', [SHUController::class, 'distribute'])
            ->middleware('role:ADMIN');
        Route::get('/{year}', [SHUController::class, 'index'])
            ->middleware('role:ADMIN,MANAGER,ACCOUNTANT');
        Route::post('/{id}/pay', [SHUController::class, 'pay'])
            ->middleware('role:ADMIN,MANAGER,TELLER');
    });

    // ─── Dashboard ───
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

    // ─── Laporan Unit Usaha ───
    Route::prefix('reports')->middleware('role:ADMIN,MANAGER,ACCOUNTANT')->group(function () {
        Route::get('/unit-toko', [ReportController::class, 'unitToko']);
        Route::get('/unit-pembiayaan', [ReportController::class, 'unitPembiayaan']);
    });

    // ─── Struk / Receipt ───
    Route::prefix('receipts')->group(function () {
        Route::get('/saving/{id}', [ReceiptController::class, 'saving']);
        Route::get('/loan-payment/{id}', [ReceiptController::class, 'loanPayment']);
        Route::get('/sale/{id}', [ReceiptController::class, 'sale']);
    });

    // ─── Payments (QRIS) ───
    Route::prefix('payments')->group(function () {
        Route::post('/qris', [PaymentController::class, 'createQris']);
        Route::get('/{id}/status', [PaymentController::class, 'checkStatus']);
        Route::get('/history', [PaymentController::class, 'history']);
    });

    // ─── Export (CSV) ───
    Route::prefix('export')->middleware('role:ADMIN,MANAGER,ACCOUNTANT,TELLER')->group(function () {
        Route::get('/members', [ExportController::class, 'members']);
        Route::get('/savings', [ExportController::class, 'savings']);
        Route::get('/loans', [ExportController::class, 'loans']);
    });

    // ─── Portal Anggota (self-service) ───
    Route::prefix('me')->group(function () {
        Route::get('/dashboard', [MemberPortalController::class, 'dashboard']);
        Route::get('/savings', [MemberPortalController::class, 'savings']);
        Route::get('/loans', [MemberPortalController::class, 'loans']);
    });

    // ─── User Management ───
    Route::prefix('users')->middleware('role:ADMIN')->group(function () {
        Route::get('/', [UserController::class, 'index']);
        Route::post('/', [UserController::class, 'store']);
        Route::put('/{id}', [UserController::class, 'update']);
        Route::delete('/{id}', [UserController::class, 'destroy']);
        Route::post('/{id}/reset-password', [UserController::class, 'resetPassword']);
    });

    // ─── Settings ───
    Route::prefix('settings')->middleware('role:ADMIN')->group(function () {
        Route::get('/', [SettingsController::class, 'index']);
        Route::put('/', [SettingsController::class, 'update']);
    });

    // ─── Activity Log ───
    Route::get('/activity-logs', [ActivityLogController::class, 'index'])
        ->middleware('role:ADMIN,MANAGER');
});
