<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * Usage in routes: ->middleware('role:ADMIN,MANAGER')
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $allowedRoles = array_map(fn($r) => UserRole::from($r), $roles);

        if (!$user->hasRole(...$allowedRoles)) {
            return response()->json([
                'message' => 'Anda tidak memiliki akses untuk fitur ini',
            ], 403);
        }

        return $next($request);
    }
}
