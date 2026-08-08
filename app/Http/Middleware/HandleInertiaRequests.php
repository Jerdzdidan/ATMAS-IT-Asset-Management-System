<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');
        $user = $request->user();

        return array_merge(parent::share($request), [
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $user,
                // Mirrors the route middleware so pages can hide the actions a role cannot perform.
                'permissions' => [
                    'manages_assets' => $user?->managesAssets() ?? false,
                    'manages_users' => $user?->managesUsers() ?? false,
                    'views_register' => $user?->viewsRegister() ?? false,
                    'views_audit_trail' => $user?->viewsAuditTrail() ?? false,
                    'is_department_scoped' => $user?->isDepartmentScoped() ?? false,
                ],
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                // Row-by-row outcome of a spreadsheet import, shown on the import console.
                'importSummary' => $request->session()->get('importSummary'),
            ],
        ]);
    }
}
