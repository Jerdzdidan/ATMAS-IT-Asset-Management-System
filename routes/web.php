<?php

use App\Http\Controllers\Admin\ActivityLogController;
use App\Http\Controllers\Admin\AssetAssignmentController;
use App\Http\Controllers\Admin\AssetCategoryController;
use App\Http\Controllers\Admin\AssetController;
use App\Http\Controllers\Admin\AssetLabelController;
use App\Http\Controllers\Admin\AssetLookupController;
use App\Http\Controllers\Admin\AssetPhotoController;
use App\Http\Controllers\Admin\AssetPortabilityController;
use App\Http\Controllers\Admin\DepartmentController;
use App\Http\Controllers\Admin\MaintenanceRequestController;
use App\Http\Controllers\Admin\MaintenanceScheduleController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Employee\AssetController as EmployeeAssetController;
use App\Http\Controllers\Employee\MaintenanceRequestController as EmployeeMaintenanceRequestController;
use App\Services\Reports\ReportCatalog;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->get('/', function () {
    return redirect()->route('dashboard');
})->name('home');

Route::middleware(['auth'])
    ->get('dashboard', DashboardController::class)
    ->name('dashboard');

/*
 * The address printed inside every asset QR code.
 *
 * Kept short and outside the admin prefix so the encoded URL stays small, which keeps the
 * printed code coarse enough to scan from a scuffed sticker.
 */
Route::middleware(['auth', 'register.viewer'])
    ->get('a/{tag}', [AssetLookupController::class, 'lookup'])
    ->name('assets.lookup');

// Read-only register access for management, auditors, and department heads.
Route::middleware(['auth', 'register.viewer'])->prefix('admin')->name('admin.')->group(function () {
    Route::resource('assets', AssetController::class)->only(['index', 'show']);
    Route::get('maintenance-requests', [MaintenanceRequestController::class, 'index'])->name('maintenance_requests.index');
    Route::get('maintenance-schedules', [MaintenanceScheduleController::class, 'index'])->name('maintenance_schedules.index');

    Route::get('scan', [AssetLookupController::class, 'scan'])->name('scan.index');
    Route::post('scan', [AssetLookupController::class, 'resolve'])->name('scan.resolve');
    Route::get('labels', [AssetLabelController::class, 'sheet'])->name('labels.sheet');
    Route::get('labels/download', [AssetLabelController::class, 'download'])->name('labels.download');
    Route::get('assets/{asset}/label', [AssetLabelController::class, 'single'])->name('assets.label');

    /*
     * The catalogue lists the reports; each one then lives at its own address so a filtered
     * view can be bookmarked and shared. The slug whitelist keeps `export` from ever being
     * mistaken for a report name.
     */
    Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('reports/{slug}', [ReportController::class, 'show'])
        ->whereIn('slug', ReportCatalog::slugs())
        ->name('reports.show');
    Route::get('reports/{slug}/export', [ReportController::class, 'export'])
        ->whereIn('slug', ReportCatalog::slugs())
        ->name('reports.export');
    Route::get('reports/{slug}/data', [ReportController::class, 'data'])
        ->whereIn('slug', ReportCatalog::slugs())
        ->name('reports.data');
});

Route::middleware(['auth', 'asset.manager'])->prefix('admin')->name('admin.')->group(function () {
    Route::post('assets/{asset}/retire', [AssetController::class, 'retire'])->name('assets.retire');
    Route::post('assets/{asset}/restore', [AssetController::class, 'restore'])->name('assets.restore');
    Route::post('assets/{asset}/assignments', [AssetAssignmentController::class, 'store'])->name('assets.assignments.store');
    Route::patch('assignments/{assignment}/return', [AssetAssignmentController::class, 'update'])->name('assignments.return');
    Route::resource('assets', AssetController::class)->only(['store', 'update', 'destroy']);
    Route::resource('categories', AssetCategoryController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::patch('maintenance-requests/{maintenanceRequest}', [MaintenanceRequestController::class, 'update'])
        ->name('maintenance_requests.update');

    Route::post('assets/{asset}/photos', [AssetPhotoController::class, 'store'])->name('assets.photos.store');
    Route::post('assets/{asset}/photos/{photo}/primary', [AssetPhotoController::class, 'primary'])->name('assets.photos.primary');
    Route::delete('assets/{asset}/photos/{photo}', [AssetPhotoController::class, 'destroy'])->name('assets.photos.destroy');

    Route::post('maintenance-schedules', [MaintenanceScheduleController::class, 'store'])->name('maintenance_schedules.store');
    Route::patch('maintenance-schedules/{maintenanceSchedule}', [MaintenanceScheduleController::class, 'update'])
        ->name('maintenance_schedules.update');
    Route::post('maintenance-schedules/{maintenanceSchedule}/complete', [MaintenanceScheduleController::class, 'complete'])
        ->name('maintenance_schedules.complete');
    Route::delete('maintenance-schedules/{maintenanceSchedule}', [MaintenanceScheduleController::class, 'destroy'])
        ->name('maintenance_schedules.destroy');

    /*
     * Kept under a prefix of their own so no path segment can be mistaken for an asset id by
     * the `assets` resource routes above.
     */
    Route::get('import-export', [AssetPortabilityController::class, 'index'])->name('portability.index');
    Route::get('import-export/download', [AssetPortabilityController::class, 'export'])->name('portability.export');
    Route::get('import-export/template', [AssetPortabilityController::class, 'template'])->name('portability.template');
    Route::post('import-export', [AssetPortabilityController::class, 'import'])->name('portability.import');
});

Route::middleware(['auth', 'audit.viewer'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('logs', [ActivityLogController::class, 'index'])->name('logs.index');
});

Route::middleware(['auth', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::resource('users', UserController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::resource('departments', DepartmentController::class)->only(['index', 'store', 'update', 'destroy']);
});

Route::middleware(['auth'])->prefix('my')->name('employee.')->group(function () {
    Route::get('assets', [EmployeeAssetController::class, 'index'])->name('assets.index');
    Route::get('requests', [EmployeeMaintenanceRequestController::class, 'index'])->name('requests.index');
    Route::post('requests', [EmployeeMaintenanceRequestController::class, 'store'])->name('requests.store');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
