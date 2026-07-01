<?php
// app/Http/Controllers/Api/LorryTransactionController.php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\LorryTransaction;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class LorryTransactionController extends Controller
{
    public function index(): JsonResponse
    {
        $transactions = LorryTransaction::all();
        return response()->json($transactions);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lorry_name' => 'required|string|max:255',
            'customer_code' => 'required|string|max:255',
            'total_amount' => 'required|numeric|min:0',
            'box_type' => 'required|string|max:255',
            'lorry_amount' => 'required|numeric|min:0',
            'nattami' => 'required|numeric|min:0',
        ]);

        $transaction = LorryTransaction::create($validated);
        
        return response()->json([
            'message' => 'Transaction created successfully',
            'data' => $transaction
        ], 201);
    }

    public function show($id): JsonResponse
    {
        $transaction = LorryTransaction::findOrFail($id);
        return response()->json($transaction);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $transaction = LorryTransaction::findOrFail($id);
        
        $validated = $request->validate([
            'lorry_name' => 'sometimes|required|string|max:255',
            'customer_code' => 'sometimes|required|string|max:255',
            'total_amount' => 'sometimes|required|numeric|min:0',
            'box_type' => 'sometimes|required|string|max:255',
            'lorry_amount' => 'sometimes|required|numeric|min:0',
            'nattami' => 'sometimes|required|numeric|min:0',
        ]);

        $transaction->update($validated);
        
        return response()->json([
            'message' => 'Transaction updated successfully',
            'data' => $transaction
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $transaction = LorryTransaction::findOrFail($id);
        $transaction->delete();
        
        return response()->json([
            'message' => 'Transaction deleted successfully'
        ]);
    }
}