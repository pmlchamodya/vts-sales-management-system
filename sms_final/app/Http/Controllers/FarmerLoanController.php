<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\FarmerLoan;
use App\Models\Setting;
use App\Models\Supplier; // Assuming you have a Supplier/Farmer model
use Illuminate\Http\JsonResponse;

class FarmerLoanController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $settingDate = Setting::where('key', 'Date')->value('value') ?? now()->toDateString();

        $validated = $request->validate([
            'loan_type' => 'required|string|in:old,today,ingoing,outgoing',
            'settling_way' => 'nullable|string|in:cash,cheque',
            'supplier_code' => 'required|string', // Farmers usually identified by code
            'amount' => 'required|numeric',
            'description' => 'nullable|string|max:255',
            'bill_no' => 'nullable|string|max:255',
            'cheque_no' => 'nullable|string',
            'bank' => 'nullable|string',
            'cheque_date' => 'nullable|date',
        ]);

        $loan = new FarmerLoan();
        $loan->Date = $settingDate;
        $loan->supplier_code = $validated['supplier_code'];
        $loan->loan_type = $validated['loan_type'];
        $loan->settling_way = $validated['settling_way'] ?? 'cash';
        $loan->bill_no = $validated['bill_no'];
        $loan->description = $validated['description'];
        
        // Logic: if today (taking loan), amount is negative; if old (paying back), amount is positive
        $loan->amount = ($validated['loan_type'] === 'today' || $validated['loan_type'] === 'outgoing') 
                        ? -abs($validated['amount']) 
                        : abs($validated['amount']);

        $loan->cheque_no = $validated['cheque_no'];
        $loan->bank = $validated['bank'];
        $loan->cheque_date = $validated['cheque_date'];
        $loan->ip_address = $request->ip();
        $loan->save();

        return response()->json(['message' => 'Farmer loan recorded successfully'], 201);
    }

    public function getTodayLoans()
    {
        $date = Setting::where('key', 'Date')->value('value') ?? now()->toDateString();
        $loans = FarmerLoan::whereDate('Date', $date)->get();
        return response()->json($loans);
    }
    public function getFarmerBalance($supplier_code): JsonResponse
{
    // Calculate total for 'old' (Repayments/Additions)
    $totalOld = \App\Models\FarmerLoan::where('supplier_code', $supplier_code)
        ->where('loan_type', 'old')
        ->sum(\DB::raw('ABS(amount)'));

    // Calculate total for 'today' (Loans given/Payments)
    $totalToday = \App\Models\FarmerLoan::where('supplier_code', $supplier_code)
        ->where('loan_type', 'today')
        ->sum(\DB::raw('ABS(amount)'));

    // Result = Total Old - Total Today
    $balance = $totalOld - $totalToday;

    return response()->json([
        'balance' => (float)$balance
    ]);
}
// --- FETCH FARMER LOAN BREAKDOWN ---
    public function getBreakdown($code)
    {
        $supplier = Supplier::where('code', $code)->first();
        if (!$supplier) {
            return response()->json(['error' => 'Farmer not found'], 404);
        }

        // Fetch old (+) and today (-) loans for the farmer
        $loans = FarmerLoan::where('supplier_code', $code)
            ->whereIn('loan_type', ['old', 'today'])
            ->orderBy('Date', 'asc')
            ->orderBy('created_at', 'asc')
            ->get();

        $breakdown = [];
        $runningBalance = 0;

        foreach ($loans as $loan) {
            $increase = 0;
            $decrease = 0;

            if ($loan->loan_type === 'old') {
                // old = ගොවි ණයට එකතු කිරීම (+)
                $increase = abs($loan->amount); 
                $runningBalance += $increase;
            } elseif ($loan->loan_type === 'today') {
                // today = ගොවියන්ගේ ණය ගෙවීම (-)
                $decrease = abs($loan->amount); 
                $runningBalance -= $decrease;
            }

            $displayDate = $loan->Date ?? \Carbon\Carbon::parse($loan->created_at)->format('Y-m-d');

            $breakdown[] = [
                'date' => $displayDate,
                'description' => $loan->description,
                'bill_no' => $loan->bill_no,
                'decrease' => $decrease > 0 ? number_format($decrease, 2) : '',
                'increase' => $increase > 0 ? number_format($increase, 2) : '',
                'balance' => number_format($runningBalance, 2)
            ];
        }

        return response()->json([
            'customer_name' => $supplier->name,
            'customer_short_name' => $supplier->code,
            'report_date' => now()->format('Y-m-d H:i:s A'),
            'data' => $breakdown,
            'final_balance' => number_format($runningBalance, 2)
        ]);
    }
}