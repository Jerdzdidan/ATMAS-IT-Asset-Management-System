<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AssetStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAssetRequest;
use App\Http\Requests\UpdateAssetRequest;
use App\Models\Asset;
use App\Models\AssetCategory;
use App\Models\AssetTagSequence;
use App\Models\User;
use App\Services\AssetQrCodeGenerator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AssetController extends Controller
{
    public function __construct(private readonly AssetQrCodeGenerator $qrCodes) {}

    /**
     * Display the centralized hardware register.
     */
    public function index(Request $request): Response
    {
        $currentYear = (int) now()->year;

        return Inertia::render('admin/assets', [
            'assets' => Asset::query()
                ->with([
                    'category:id,name',
                    'department:id,name',
                    'primaryPhoto:id,asset_id,path',
                    'currentAssignment:id,asset_id,user_id,assigned_at',
                    'currentAssignment.user:id,name,employee_code',
                ])
                ->visibleTo($request->user())
                ->orderByNewestTag()
                ->get(),
            'categories' => AssetCategory::query()->select(['id', 'name'])->orderBy('name')->get(),
            'currentYear' => $currentYear,
            // Lets the register form preview the tag before saving. Only this year's counter is
            // known, so an asset bought in an earlier year previews its number as a placeholder.
            'nextTagNumber' => (int) (AssetTagSequence::query()->where('year', $currentYear)->value('next_number') ?? 1),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): never
    {
        abort(404);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreAssetRequest $request): RedirectResponse
    {
        $asset = Asset::create($request->validated());

        return to_route('admin.assets.show', $asset)->with('success', 'Asset registered successfully.');
    }

    /**
     * Display the asset record together with its custody and maintenance history.
     */
    public function show(Request $request, Asset $asset): Response
    {
        abort_unless($asset->isVisibleTo($request->user()), 403);

        $asset->load([
            'category:id,name',
            'department:id,name',
            'photos' => fn ($query) => $query->orderByDesc('is_primary')->latest('id'),
            'maintenanceSchedules' => fn ($query) => $query->orderBy('next_due_on'),
            'assignments' => fn ($query) => $query->latest('assigned_at')->latest('id'),
            'assignments.user:id,name,employee_code',
            'assignments.assignedBy:id,name',
            'assignments.returnedBy:id,name',
            'maintenanceRequests' => fn ($query) => $query->latest('id'),
            'maintenanceRequests.requestedBy:id,name',
            'maintenanceRequests.handledBy:id,name',
        ]);

        return Inertia::render('admin/asset-show', [
            'asset' => $asset,
            // Feeds the edit dialog, which is the same form the register list opens.
            'categories' => AssetCategory::query()->select(['id', 'name'])->orderBy('name')->get(),
            'currentAssignment' => $asset->assignments->firstWhere('returned_at', null),
            'assignableUsers' => User::query()
                ->select(['id', 'name', 'employee_code'])
                ->where('status', 'ACTIVE')
                ->orderBy('name')
                ->get(),
            'qrCode' => $this->qrCodes->dataUri($asset),
            'labelPngUrl' => route('admin.assets.label', $asset),
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Asset $asset): never
    {
        abort(404);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateAssetRequest $request, Asset $asset): RedirectResponse
    {
        $asset->update($request->validated());

        return back()->with('success', 'Asset updated successfully.');
    }

    /**
     * Take the asset out of active service at the end of its lifecycle.
     */
    public function retire(Asset $asset): RedirectResponse
    {
        if ($asset->currentAssignment()->exists()) {
            throw ValidationException::withMessages(['asset' => 'Return the asset from its current holder before retiring it.']);
        }

        $asset->update(['status' => AssetStatus::Retired]);

        return back()->with('success', 'Asset retired successfully.');
    }

    /**
     * Bring a retired asset back into the available pool.
     */
    public function restore(Asset $asset): RedirectResponse
    {
        if (! $asset->status->isRetired()) {
            throw ValidationException::withMessages(['asset' => 'Only retired assets can be restored.']);
        }

        $asset->update(['status' => AssetStatus::Available]);

        return back()->with('success', 'Asset restored to the available pool.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Asset $asset): RedirectResponse
    {
        if ($asset->assignments()->exists() || $asset->maintenanceRequests()->exists()) {
            throw ValidationException::withMessages(['asset' => 'This asset cannot be deleted because it has custody or maintenance history. Retire it instead.']);
        }

        $asset->delete();

        return to_route('admin.assets.index')->with('success', 'Asset deleted successfully.');
    }
}
