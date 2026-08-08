<?php

namespace App\Providers;

use App\Listeners\RecordAuthenticationActivity;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Registered by hand rather than left to discovery: one listener serves two events.
        Event::listen(Login::class, [RecordAuthenticationActivity::class, 'handleLogin']);
        Event::listen(Logout::class, [RecordAuthenticationActivity::class, 'handleLogout']);
    }
}
