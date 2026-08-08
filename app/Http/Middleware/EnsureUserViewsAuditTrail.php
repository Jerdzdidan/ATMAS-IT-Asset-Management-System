<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserViewsAuditTrail
{
    /**
     * Handle an incoming request.
     *
     * Guards the audit trail, which is narrower than the register: management can read every
     * asset but has no business reading the record of who touched it.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->user()?->viewsAuditTrail(), 403);

        return $next($request);
    }
}
