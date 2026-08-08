<?php

use App\Http\Controllers\Admin\AssetAssignmentController;
use App\Http\Controllers\Admin\AssetCategoryController;
use App\Http\Controllers\Admin\AssetController;
use App\Http\Controllers\Admin\DepartmentController;
use App\Http\Controllers\Admin\MaintenanceRequestController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Employee\AssetController as EmployeeAssetController;
use App\Http\Controllers\Employee\MaintenanceRequestController as EmployeeMaintenanceRequestController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->get('/', function () {
    return redirect()->route('dashboard');
})->name('home');

Route::middleware(['auth'])
    ->get('dashboard', DashboardController::class)
    ->name('dashboard');

// Read-only register access for management, auditors, and department heads.
Route::middleware(['auth', 'register.viewer'])->prefix('admin')->name('admin.')->group(function () {
    Route::resource('assets', AssetController::class)->only(['index', 'show']);
    Route::get('maintenance-requests', [MaintenanceRequestController::class, 'index'])->name('maintenance_requests.index');
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
});

Route::middleware(['auth', 'super.admin'])->prefix('admin')->name('admin.')->group(function () {
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
