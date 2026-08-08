<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AssetCondition;
use App\Http\Controllers\Controller;
use App\Http\Requests\ReturnAssetAssignmentRequest;
use App\Http\Requests\StoreAssetAssignmentRequest;
use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\User;
use App\Services\AssetAssignmentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;

class AssetAssignmentController extends Controller
{
    public function __construct(private AssetAssignmentService $assignmentService) {}

    /**
     * Issue the asset to an employee and open a custody record.
     */
    public function store(StoreAssetAssignmentRequest $request, Asset $asset): RedirectResponse
    {
        $validated = $request->validated();

        $this->assignmentService->assign(
            $asset,
            User::findOrFail($validated['user_id']),
            $request->user(),
            Carbon::parse($validated['assigned_at']),
            $validated['notes'] ?? null,
        );

        return back()->with('success', 'Asset issued successfully.');
    }

    /**
     * Close the custody record when the employee hands the asset back.
     */
    public function update(ReturnAssetAssignmentRequest $request, AssetAssignment $assignment): RedirectResponse
    {
        $validated = $request->validated();

        $this->assignmentService->returnAsset(
            $assignment,
            $request->user(),
            Carbon::parse($validated['returned_at']),
            AssetCondition::from($validated['condition']),
            $validated['return_notes'] ?? null,
        );

        return back()->with('success', 'Asset returned successfully.');
    }
}
