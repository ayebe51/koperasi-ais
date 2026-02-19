<?php

namespace App\Http\Traits;

use Illuminate\Http\JsonResponse;

trait ApiResponse
{
    protected function success($data = null, string $message = null, int $code = 200): JsonResponse
    {
        $response = ['success' => true];
        if ($message)
            $response['message'] = $message;
        if ($data !== null)
            $response['data'] = $data;

        return response()->json($response, $code);
    }

    protected function created($data = null, string $message = 'Berhasil dibuat'): JsonResponse
    {
        return $this->success($data, $message, 201);
    }

    protected function error(string $message, int $code = 400, $errors = null): JsonResponse
    {
        $response = [
            'success' => false,
            'message' => $message,
        ];
        if ($errors)
            $response['errors'] = $errors;

        return response()->json($response, $code);
    }

    protected function paginated($paginator, string $message = null): JsonResponse
    {
        $response = [
            'success' => true,
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ];
        if ($message)
            $response['message'] = $message;

        return response()->json($response);
    }
}
