<?php

namespace App\Http\Controllers\SHU;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Services\SHU\SHUService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SHUController extends Controller
{
    use ApiResponse;

    public function __construct(private SHUService $shuService)
    {
    }

    /**
     * Preview SHU calculation (no persistence)
     * GET /api/shu/calculate?year=XXXX  OR  GET /api/shu/calculate/{year}
     */
    public function calculate(Request $request, ?int $year = null): JsonResponse
    {
        $year = $year ?? (int) $request->query('year', date('Y'));
        try {
            $result = $this->shuService->calculate($year);
            return $this->success($result, "Perhitungan SHU tahun {$year}");
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * Finalize SHU distribution
     * POST /api/shu/distribute
     */
    public function distribute(Request $request): JsonResponse
    {
        $request->validate([
            'year' => 'required|integer|min:2020|max:2099',
        ]);

        try {
            $result = $this->shuService->distribute(
                $request->year,
                $request->user()->id
            );
            return $this->created($result, "SHU tahun {$request->year} berhasil didistribusikan");
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * List distributions for a fiscal year
     * GET /api/shu/{year}
     */
    public function index(int $year): JsonResponse
    {
        $result = $this->shuService->getDistributions($year);
        return $this->success($result, "Distribusi SHU tahun {$year}");
    }

    /**
     * Mark distribution as paid
     * POST /api/shu/{id}/pay
     */
    public function pay(string $id): JsonResponse
    {
        try {
            $dist = $this->shuService->payMember($id);
            return $this->success($dist, 'SHU anggota berhasil dibayarkan');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }
}
