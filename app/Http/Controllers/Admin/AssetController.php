<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AssetStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAssetRequest;
use App\Http\Requests\UpdateAssetRequest;
use App\Models\Asset;
use App\Models\AssetCategory;
use App\Models\AssetTagSequence;
use App\Models\Department;
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
                ->orderBy('asset_tag')
                ->get(),
            'categories' => $this->categoryOptions(),
            'departments' => Department::query()->select(['id', 'name'])->orderBy('name')->get(),
            'currentYear' => (int) now()->year,
        ]);
    }

    /**
     * List the categories alongside the tag each would issue next, for the register form preview.
     *
     * @return array<int, array{id: int, name: string, code: string, next_number: int}>
     */
    private function categoryOptions(): array
    {
        $currentYear = (int) now()->year;

        $nextNumbers = AssetTagSequence::query()
            ->where('year', $currentYear)
            ->pluck('next_number', 'category_code');

        return AssetCategory::query()
            ->select(['id', 'name', 'code'])
            ->orderBy('name')
            ->get()
            ->map(fn (AssetCategory $category): array => [
                'id' => $category->id,
                'name' => $category->name,
                'code' => $category->code,
                'next_number' => (int) ($nextNumbers[$category->code] ?? 1),
            ])
            ->all();
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
            'currentAssignment' => $asset->assignments->firstWhere('returned_at', null),
            'assignableUsers' => User::query()
                ->select(['id', 'name', 'employee_code'])
                ->where('status', 'ACTIVE')
                ->orderBy('name')
                ->get(),
            'qrCode' => $this->qrCodes->dataUri($asset),
            'labelUrl' => route('admin.labels.sheet', ['assets' => [$asset->id]]),
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
