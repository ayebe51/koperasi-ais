<?php

namespace App\Http\Controllers\ActivityLog;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ActivityLogController extends Controller
{
    use ApiResponse;

    private const CACHE_KEY = 'activity_logs';
    private const MAX_LOGS = 200;

    /**
     * Get activity logs (paginated).
     */
    public function index(Request $request): JsonResponse
    {
        $logs = Cache::get(self::CACHE_KEY, []);
        $perPage = (int) $request->query('per_page', 20);
        $page = (int) $request->query('page', 1);

        // Filter
        $type = $request->query('type');
        if ($type) {
            $logs = array_values(array_filter($logs, fn($l) => $l['type'] === $type));
        }

        $total = count($logs);
        $offset = ($page - 1) * $perPage;
        $items = array_slice($logs, $offset, $perPage);

        return response()->json([
            'success' => true,
            'data' => $items,
            'message' => 'Activity log',
            'meta' => [
                'current_page' => $page,
                'last_page' => max(1, (int) ceil($total / $perPage)),
                'per_page' => $perPage,
                'total' => $total,
            ],
        ]);
    }

    /**
     * Record a new activity log entry.
     * Call this statically from other controllers.
     */
    public static function record(string $type, string $description, ?int $userId = null, ?string $userName = null): void
    {
        $logs = Cache::get(self::CACHE_KEY, []);

        array_unshift($logs, [
            'id' => uniqid('log_'),
            'type' => $type,
            'description' => $description,
            'user_id' => $userId,
            'user_name' => $userName,
            'created_at' => now()->toIso8601String(),
        ]);

        // Keep only latest
        $logs = array_slice($logs, 0, self::MAX_LOGS);

        Cache::forever(self::CACHE_KEY, $logs);
    }
}
