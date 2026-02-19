<?php

namespace App\Http\Controllers\Saving;

use App\Http\Controllers\Controller;
use App\Http\Requests\Saving\DepositRequest;
use App\Http\Requests\Saving\WithdrawRequest;
use App\Http\Resources\SavingResource;
use App\Http\Traits\ApiResponse;
use App\Models\Member;
use App\Models\Saving;
use App\Services\Saving\SavingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SavingController extends Controller
{
    use ApiResponse;

    public function __construct(
        private SavingService $savingService
    ) {
    }

    /**
     * GET /api/savings
     */
    public function index(Request $request): JsonResponse
    {
        $query = Saving::with('member');

        if ($request->has('member_id'))
            $query->where('member_id', $request->member_id);
        if ($request->has('type'))
            $query->where('type', $request->type);
        if ($request->has('start_date'))
            $query->where('transaction_date', '>=', $request->start_date);
        if ($request->has('end_date'))
            $query->where('transaction_date', '<=', $request->end_date);

        $savings = $query->orderByDesc('transaction_date')
            ->orderByDesc('created_at')
            ->paginate($request->per_page ?? 15);

        return SavingResource::collection($savings)->response();
    }

    /**
     * POST /api/savings/deposit
     */
    public function deposit(DepositRequest $request): JsonResponse
    {
        try {
            $saving = $this->savingService->deposit($request->validated());
            return $this->created(new SavingResource($saving), 'Setoran simpanan berhasil');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /api/savings/withdraw
     */
    public function withdraw(WithdrawRequest $request): JsonResponse
    {
        try {
            $saving = $this->savingService->withdraw($request->validated());
            return $this->created(new SavingResource($saving), 'Penarikan simpanan berhasil');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * GET /api/savings/summary
     * Aggregate savings balance across all members
     */
    public function summary(): JsonResponse
    {
        $totals = ['pokok' => 0, 'wajib' => 0, 'sukarela' => 0];

        foreach (['POKOK', 'WAJIB', 'SUKARELA'] as $type) {
            // Get the latest transaction per member for this type using created_at
            $total = Saving::where('type', $type)
                ->whereIn('created_at', function ($query) use ($type) {
                    $query->selectRaw('MAX(created_at)')
                        ->from('savings')
                        ->where('type', $type)
                        ->groupBy('member_id');
                })
                ->sum('balance');

            $totals[strtolower($type)] = (float) $total;
        }

        $totals['total'] = $totals['pokok'] + $totals['wajib'] + $totals['sukarela'];

        return $this->success($totals);
    }

    /**
     * GET /api/savings/balance/{memberId}
     */
    public function balance(string $memberId): JsonResponse
    {
        $member = Member::findOrFail($memberId);

        $pokok = $member->getSavingBalance('POKOK');
        $wajib = $member->getSavingBalance('WAJIB');
        $sukarela = $member->getSavingBalance('SUKARELA');

        return $this->success([
            'member_id' => $member->id,
            'member_name' => $member->name,
            'simpanan_pokok' => $pokok,
            'simpanan_wajib' => $wajib,
            'simpanan_sukarela' => $sukarela,
            'total' => $pokok + $wajib + $sukarela,
        ]);
    }
}
