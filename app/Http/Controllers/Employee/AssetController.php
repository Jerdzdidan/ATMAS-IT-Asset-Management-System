<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\AssetAssignment;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AssetController extends Controller
{
    /**
     * Display the hardware currently issued to the signed-in employee.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('employee/assets', [
            'assignments' => AssetAssignment::query()
                ->with(['asset:id,asset_tag,name,asset_category_id,brand,model,serial_number,location,status,condition,warranty_expires_at', 'asset.category:id,name'])
                ->where('user_id', $request->user()->id)
                ->latest('assigned_at')
                ->latest('id')
                ->get(),
        ]);
    }
}
