<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\Asset;
use App\Models\Department;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        return Inertia::render('admin/users', [
            'users' => User::query()
                ->select(['id', 'name', 'email', 'role', 'employee_code', 'department_id', 'position', 'contact_number', 'status'])
                ->with('department:id,name')
                ->orderBy('name')
                ->get(),
            'departments' => Department::query()->select(['id', 'name'])->orderBy('name')->get(),
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
    public function store(StoreUserRequest $request): RedirectResponse
    {
        User::create($request->validated());

        return to_route('admin.users.index')->with('success', 'User created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(User $user): never
    {
        abort(404);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(User $user): never
    {
        abort(404);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $validated = $request->validated();

        // Leaving the password blank keeps the current credentials in place.
        if (blank($validated['password'] ?? null)) {
            unset($validated['password']);
        }

        $movedDepartment = array_key_exists('department_id', $validated)
            && (int) $validated['department_id'] !== (int) $user->department_id;

        $user->update($validated);

        if ($movedDepartment) {
            $this->followEmployeeToNewDepartment($user);
        }

        return to_route('admin.users.index')->with('success', 'User updated successfully.');
    }

    /**
     * Move the hardware an employee is holding into their new department.
     *
     * An asset's department is a copy of its holder's, kept on the asset so every report and the
     * department-head scoping can filter on one column. That copy has to be refreshed when someone
     * transfers, or their laptop stays behind in the department they left.
     */
    private function followEmployeeToNewDepartment(User $user): void
    {
        Asset::query()
            ->heldBy($user->id)
            ->update(['department_id' => $user->department_id]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($user->id === $request->user()->id) {
            throw ValidationException::withMessages(['user' => 'You cannot delete your own account.']);
        }

        if ($user->assetAssignments()->exists() || $user->maintenanceRequests()->exists()) {
            throw ValidationException::withMessages(['user' => 'This user cannot be deleted because they have asset custody or maintenance history. Set the account to inactive instead.']);
        }

        $user->delete();

        return to_route('admin.users.index')->with('success', 'User deleted successfully.');
    }
}
