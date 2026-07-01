<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Customer;
use App\Models\Supplier; // 👇 Supplier Model එක Import කළා
use App\Models\CustomersLoan;
use App\Models\IncomeExpenses;
use App\Models\Sale; 
use App\Models\GrnEntry;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse; 

class CustomersLoanController extends Controller
{
    private function fetchTodayLoans($date)
    {
        $query = IncomeExpenses::with('customer')
            ->whereDate('Date', $date)
            ->where('loan_type', '!=', 'returns');

        $loans = $query->orderBy('created_at', 'desc')->get();

        return $loans->map(function ($loan) {
            return [
                'id' => $loan->id, 
                'customer_id' => $loan->customer_id,
                'supplier_code' => $loan->supplier_code, // 👇 Added Supplier Code
                'loan_type' => $loan->loan_type,
                'description' => $loan->description,
                'amount' => (float) $loan->amount, 
                'display_amount' => number_format(abs($loan->amount), 2), 
                'customer_short_name' => $loan->customer_short_name,
                'bill_no' => $loan->bill_no,
                'settling_way' => $loan->settling_way,
                'cheque_no' => $loan->cheque_no,
                'bank' => $loan->bank,
                'cheque_date' => $loan->cheque_date,
            ];
        });
    }

    public function getInitialData(Request $request)
    {
        $grnCodes = GrnEntry::distinct()->pluck('code');
        $settingDate = Setting::value('value') ?? now()->toDateString();
        $loans = $this->fetchTodayLoans($settingDate);

        return response()->json([
            'grnCodes' => $grnCodes,
            'loans' => $loans,
            'settingDate' => $settingDate
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $settingDate = Setting::value('value') ?? now()->toDateString();

        $rules = [
            'loan_type' => 'required|string|in:old,today,ingoing,outgoing,grn_damage,returns,supplier_repayment,supplier_sale',
            'settling_way' => 'nullable|string|in:cash,cheque',
            'customer_id' => 'nullable|exists:customers,id',
            'supplier_code' => 'nullable|string', // 👇 Validating Supplier Code
            'amount' => 'nullable|numeric',
            'description' => 'nullable|string|max:255',
            'bill_no' => 'nullable|string|max:255',
            'cheque_no' => 'nullable|string|max:255',
            'bank' => 'nullable|string|max:255',
            'cheque_date' => 'nullable|date',
        ];

        $loanType = $request->input('loan_type');
        $validated = $request->validate($rules);

        // --- Handle Supplier Specific Loans ---
        if ($loanType === 'supplier_repayment' || $loanType === 'supplier_sale') {
            
            $supplier = Supplier::where('code', $validated['supplier_code'])->first();
            if (!$supplier) {
                return response()->json(['error' => 'Supplier not found'], 404);
            }

            // ගොවියන්ගේ ණය පියවීම (-) -> Reduct from advance_amount (Supplier owes less or gets negative balance)
            if ($loanType === 'supplier_repayment') {
                $supplier->advance_amount -= abs($validated['amount']);
            } 
            // ගොවියන්ගේ එළවළු විකුණුම (+) -> Add to advance_amount
            elseif ($loanType === 'supplier_sale') {
                $supplier->advance_amount += abs($validated['amount']);
            }
            $supplier->save();

            // Record to Income Expenses
            $incomeExpense = new IncomeExpenses();
            $incomeExpense->loan_type = $loanType;
            $incomeExpense->supplier_code = $validated['supplier_code'];
            $incomeExpense->description = $validated['description'];
            $incomeExpense->bill_no = $validated['bill_no'] ?? null;
            $incomeExpense->amount = ($loanType === 'supplier_repayment') ? -abs($validated['amount']) : abs($validated['amount']);
            $incomeExpense->type = ($loanType === 'supplier_repayment') ? 'expense' : 'income';
            $incomeExpense->date = $settingDate;
            $incomeExpense->ip_address = $request->ip();
            $incomeExpense->save();

            return response()->json(['message' => 'Supplier record added successfully!'], 201);
        }

        // --- Original Customer Logic ---
        $customerShortName = null;
        if (!empty($validated['customer_id'])) {
            $customer = Customer::find($validated['customer_id']);
            if ($customer) {
                $customerShortName = $customer->short_name;
            }
        }

        $incomeExpense = new IncomeExpenses();
        $incomeExpense->loan_type = $loanType;
        $incomeExpense->customer_id = $validated['customer_id'] ?? null;
        $incomeExpense->description = $validated['description'];
        $incomeExpense->bill_no = $validated['bill_no'] ?? null;
        $incomeExpense->cheque_no = $validated['cheque_no'] ?? null;
        $incomeExpense->bank = $validated['bank'] ?? null;
        $incomeExpense->cheque_date = $validated['cheque_date'] ?? null;
        $incomeExpense->settling_way = $validated['settling_way'] ?? 'cash';
        $incomeExpense->customer_short_name = $customerShortName;
        $incomeExpense->date = $settingDate;
        $incomeExpense->ip_address = $request->ip();

        if ($loanType === 'ingoing') {
            $incomeExpense->amount = $validated['amount'];
            $incomeExpense->type = 'income';
        } elseif ($loanType === 'outgoing') {
            $incomeExpense->amount = -$validated['amount'];
            $incomeExpense->type = 'expense';
        } elseif ($loanType === 'old') { 
            $incomeExpense->amount = $validated['amount'];
            $incomeExpense->type = 'income';
        } elseif ($loanType === 'today') { 
            $incomeExpense->amount = -$validated['amount'];
            $incomeExpense->type = 'expense';
        }

        $incomeExpense->save();

        if (in_array($loanType, ['old', 'today']) && $incomeExpense->customer_id) {
            $loan = new CustomersLoan();
            $loan->fill($incomeExpense->getAttributes());
            $loan->amount = abs($validated['amount']); 
            $loan->loan_type = $loanType;
            $loan->save();
            $incomeExpense->loan_id = $loan->id;
            $incomeExpense->save();
        }

       return response()->json([], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $rules = [
            'loan_type' => 'required|string|in:old,today,ingoing,outgoing,grn_damage,supplier_repayment,supplier_sale',
            'settling_way' => 'nullable|string|in:cash,cheque',
            'customer_id' => 'nullable|exists:customers,id',
            'supplier_code' => 'nullable|string',
            'amount' => 'nullable|numeric|min:0',
            'description' => 'required|string|max:255',
            'bill_no' => 'nullable|string|max:255',
        ];

        try {
            $validated = $request->validate($rules);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        }

        $incomeExpense = IncomeExpenses::findOrFail($id); 

        // If it was a supplier loan, revert the old balance first before applying new
        if (in_array($incomeExpense->loan_type, ['supplier_repayment', 'supplier_sale'])) {
            $oldSupplier = Supplier::where('code', $incomeExpense->supplier_code)->first();
            if ($oldSupplier) {
                if ($incomeExpense->loan_type === 'supplier_repayment') {
                    $oldSupplier->advance_amount += abs($incomeExpense->amount); // Reverse minus
                } else {
                    $oldSupplier->advance_amount -= abs($incomeExpense->amount); // Reverse plus
                }
                $oldSupplier->save();
            }
        }

        // Apply new supplier logic
        if (in_array($validated['loan_type'], ['supplier_repayment', 'supplier_sale'])) {
            $newSupplier = Supplier::where('code', $validated['supplier_code'])->first();
            if ($newSupplier) {
                if ($validated['loan_type'] === 'supplier_repayment') {
                    $newSupplier->advance_amount -= abs($validated['amount']);
                } else {
                    $newSupplier->advance_amount += abs($validated['amount']);
                }
                $newSupplier->save();
            }

            $incomeExpense->loan_type = $validated['loan_type'];
            $incomeExpense->supplier_code = $validated['supplier_code'];
            $incomeExpense->amount = ($validated['loan_type'] === 'supplier_repayment') ? -abs($validated['amount']) : abs($validated['amount']);
            $incomeExpense->type = ($validated['loan_type'] === 'supplier_repayment') ? 'expense' : 'income';
            $incomeExpense->description = $validated['description'];
            $incomeExpense->save();

            return response()->json([], 201);
        }

        // Standard Customer logic
        $loan = $incomeExpense->loan_id ? CustomersLoan::find($incomeExpense->loan_id) : null; 

        $customerShortName = null;
        if (!empty($validated['customer_id'])) {
            $customer = Customer::find($validated['customer_id']);
            if ($customer) {
                $customerShortName = $customer->short_name;
            }
        }

        $incomeExpense->loan_type = $validated['loan_type'];
        $incomeExpense->customer_id = $validated['customer_id'] ?? null;
        $incomeExpense->description = $validated['description'] ?? 'N/A';
        $incomeExpense->bill_no = $validated['bill_no'] ?? null;
        $incomeExpense->customer_short_name = $customerShortName;
        
        if ($validated['loan_type'] === 'ingoing' || $validated['loan_type'] === 'old') {
            $incomeExpense->amount = abs($validated['amount']);
            $incomeExpense->type = 'income';
        } elseif ($validated['loan_type'] === 'outgoing' || $validated['loan_type'] === 'today') {
            $incomeExpense->amount = -abs($validated['amount']);
            $incomeExpense->type = 'expense';
        }

        $incomeExpense->save();

        if ($loan) {
            $loan->fill($incomeExpense->getAttributes());
            $loan->amount = abs($validated['amount']);
            $loan->save();
        }

        return response()->json([], 201);
    }

    public function destroy($id): JsonResponse
    {
        $incomeExpense = IncomeExpenses::findOrFail($id);

        // If deleting a supplier loan, revert the balance!
        if (in_array($incomeExpense->loan_type, ['supplier_repayment', 'supplier_sale'])) {
            $supplier = Supplier::where('code', $incomeExpense->supplier_code)->first();
            if ($supplier) {
                if ($incomeExpense->loan_type === 'supplier_repayment') {
                    $supplier->advance_amount += abs($incomeExpense->amount); // Reverse minus
                } else {
                    $supplier->advance_amount -= abs($incomeExpense->amount); // Reverse plus
                }
                $supplier->save();
            }
        }

        if ($incomeExpense->loan_id) {
            $loan = CustomersLoan::find($incomeExpense->loan_id);
            if ($loan) {
                $loan->delete();
            }
        }

        $incomeExpense->delete();
        return response()->json(['message' => 'Record deleted successfully!'], 200);
    }

    // Keep all other functions as they are...
    public function getTotalLoanAmount($customerId): JsonResponse { /* ... */ }
    public function getGrnEntry($code) { /* ... */ }
    public function getAllBillNos() { /* ... */ }
    public function loanReportResults(Request $request) { /* ... */ }
    public function getLoanReportData(Request $request) { /* ... */ }
}