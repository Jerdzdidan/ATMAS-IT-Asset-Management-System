<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserViewsRegister
{
    /**
     * Handle an incoming request.
     *
     * Guards the read-only side of the register, which management, auditors, and
     * department heads reach without holding any of the write permissions.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->user()?->viewsRegister(), 403);

        return $next($request);
    }
}
