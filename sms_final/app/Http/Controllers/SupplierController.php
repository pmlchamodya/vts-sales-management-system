<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use Illuminate\Http\Request;
use App\Models\Sale;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use App\Models\SupplierBillNumber;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class SupplierController extends Controller
{
    public function index()
    {
        $suppliers = Supplier::all();
        return response()->json($suppliers);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code'         => 'required|unique:suppliers',
            'name'         => 'required|string',
            'dob'          => 'required|date',
            'address'      => 'required|string',
            'telephone_no' => 'required|string|max:20',
            'bank_name'      => 'nullable|string|max:255', // ✅ NEW
            'payment_to'     => 'nullable|string|max:255', // ✅ NEW
            'account_type'   => 'nullable|string|max:50',  // ✅ NEW
            'account_number' => 'nullable|string|max:100', // ✅ NEW
            'profile_pic'  => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
            'nic_front'    => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
            'nic_back'     => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
        ]);

        // Handle Profile Picture Upload
        if ($request->hasFile('profile_pic')) {
            $data['profile_pic'] = $request->file('profile_pic')->store('suppliers/profiles', 'public');
        }

        // Handle NIC Front Upload
        if ($request->hasFile('nic_front')) {
            $data['nic_front'] = $request->file('nic_front')->store('suppliers/nic', 'public');
        }

        // Handle NIC Back Upload
        if ($request->hasFile('nic_back')) {
            $data['nic_back'] = $request->file('nic_back')->store('suppliers/nic', 'public');
        }

        // Ensure code is uppercase
        $data['code'] = strtoupper($data['code']);
        
        $supplier = Supplier::create($data);

        return response()->json([
            'message' => 'Supplier added successfully!', 
            'supplier' => $supplier
        ], 201);
    }

    public function show(Supplier $supplier)
    {
        return response()->json($supplier);
    }

    public function update(Request $request, Supplier $supplier)
    {
        $data = $request->validate([
            'code'         => 'required|unique:suppliers,code,' . $supplier->id,
            'name'         => 'required|string',
            'dob'          => 'required|date',
            'address'      => 'required|string',
            'telephone_no' => 'required|string|max:20',
            'bank_name'      => 'nullable|string|max:255', // ✅ NEW
            'payment_to'     => 'nullable|string|max:255', // ✅ NEW
            'account_type'   => 'nullable|string|max:50',  // ✅ NEW
            'account_number' => 'nullable|string|max:100', // ✅ NEW
            'profile_pic'  => 'nullable|file|mimes:jpg,jpeg,png|max:2048',
            'nic_front'    => 'nullable|file|mimes:jpg,jpeg,png|max:2048',
            'nic_back'     => 'nullable|file|mimes:jpg,jpeg,png|max:2048',
        ]);

        // Handle File Uploads (Profile and NIC)
        foreach (['profile_pic', 'nic_front', 'nic_back'] as $field) {
            if ($request->hasFile($field)) {
                // Delete old file if it exists
                if ($supplier->$field) {
                    \Storage::disk('public')->delete($supplier->$field);
                }
                
                // Set storage path based on field type
                $path = ($field === 'profile_pic') ? 'suppliers/profiles' : 'suppliers/nic';
                $data[$field] = $request->file($field)->store($path, 'public');
            }
        }

        // Ensure code is always uppercase
        $data['code'] = strtoupper($data['code']);
        
        // Update the supplier record
        $supplier->update($data);

        return response()->json([
            'message' => 'Supplier updated successfully!', 
            'supplier' => $supplier
        ]);
    }

    public function destroy(Supplier $supplier)
    {
        $supplier->delete();
        return response()->json(['message' => 'Supplier deleted successfully!']);
    }

    public function search($query)
    {
        $suppliers = Supplier::where('code', 'LIKE', $query . '%')
                    ->orWhere('name', 'LIKE', $query . '%')
                    ->orWhere('address', 'LIKE', '%' . $query . '%')
                    ->get();
        
        return response()->json($suppliers);
    }

    public function getSupplierBillStatusSummary()
    {
        // 1. Get all distinct PRINTED bills
        $printedBills = Sale::select('supplier_code', 'supplier_bill_no')
        ->where('supplier_bill_printed', 'Y')
        ->whereNotNull('supplier_bill_no')
        ->groupBy('supplier_code', 'supplier_bill_no')
        ->get();
            
        $unprintedBills = Sale::select('supplier_code')
            ->where(function ($query) {
                $query->where('supplier_bill_printed', 'N')
                      ->orWhereNull('supplier_bill_printed');
            })
            ->whereNotNull('supplier_code')
            ->groupBy('supplier_code')
            ->get(); 
            
        return response()->json([
            'printed' => $printedBills->toArray(),
            'unprinted' => $unprintedBills->toArray(),
        ]);
    }

    public function getSupplierDetails($supplierCode)
    {
        Log::info('getSupplierDetails METHOD TRIGGERED', [
            'supplierCode' => $supplierCode,
            'route' => request()->path(),
            'method' => request()->method(),
            'user_id' => auth()->id(),
        ]);

        try {
            $details = Sale::select(
                'supplier_code',
                'id',
                'customer_code',
                'item_name',
                'weight',
                'price_per_kg',
                'commission_amount',
                'total',
                'packs',
                'bill_no',
                'SupplierTotal',
                'SupplierPricePerKg',
                'SupplierPackCost',
                'CustomerPackLabour',
                'supplier_bill_printed',
                'CustomerPackCost',
                'supplier_bill_no',
                'profile_pic',
                'nic_front',
                'nic_back',
                DB::raw('DATE(created_at) as Date')
            )
            ->where('supplier_code', $supplierCode)
            ->get();

            Log::info('getSupplierDetails QUERY SUCCESS', [
                'records' => $details->count()
            ]);

            return response()->json($details);

        } catch (\Throwable $e) {
            Log::error('getSupplierDetails FAILED', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            throw $e;
        }
    }

    public function generateFSeriesBill(): JsonResponse
    {
        try {
            $newBillNo = DB::transaction(function () {
                $counter = SupplierBillNumber::where('id', 1)->lockForUpdate()->first(); 

                if (!$counter) {
                    throw new \Exception("Bill counter configuration missing. Please check the 'supplier_bill_numbers' table.");
                }

                $nextNumber = $counter->last_number + 1;
                $newBillNo = $counter->prefix . $nextNumber;

                $counter->last_number = $nextNumber;
                $counter->save();

                return $newBillNo;
            });

            return response()->json([
                'new_bill_no' => $newBillNo,
            ]);

        } catch (\Exception $e) {
            \Log::error('Error generating sequential bill number: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to generate sequential bill number. ' . $e->getMessage()
            ], 500);
        }
    }

    public function getProfitBySupplier()
    {
        try {
            $profitReport = Sale::select('supplier_code')
                ->selectRaw('SUM(profit) as total_profit')
                ->groupBy('supplier_code')
                ->orderByDesc('total_profit')
                ->get();

            return response()->json($profitReport);

        } catch (\Exception $e) {
            \Log::error('Error fetching profit by supplier:', ['exception' => $e->getMessage()]);

            return response()->json([
                'message' => 'Failed to fetch profit report data.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function marksuppliers(Request $request)
    {
        \Log::info('marksuppliers endpoint hit', [
            'request_data' => $request->all(),
            'headers' => $request->headers->all()
        ]);
        
        $validated = $request->validate([
            'transaction_ids' => 'required|array',
            'telephone_no'   => 'nullable|string',
            'advance_amount' => 'required|numeric',
            'supplier_code'  => 'required|string'
        ]);

        \Log::info('Validation passed', ['validated' => $validated]);

        $ids = $validated['transaction_ids'];

        try {
            DB::beginTransaction();
            \Log::info('Transaction started', ['ids' => $ids]);

            $counter = SupplierBillNumber::where('id', 1)->lockForUpdate()->first();
            if (!$counter) {
                \Log::error('SupplierBillNumber not found');
                throw new \Exception('Supplier bill counter not found');
            }
            
            $finalBillNo = $counter->prefix . ($counter->last_number + 1);
            $counter->increment('last_number');
            \Log::info('Bill number generated', ['bill_no' => $finalBillNo]);

            $salesRecords = Sale::whereIn('id', $ids)->get();
            \Log::info('Sales records fetched', ['count' => $salesRecords->count()]);

            $updated = Sale::whereIn('id', $ids)->update([
                'supplier_bill_no' => $finalBillNo,
                'supplier_bill_printed' => 'Y',
            ]);
            \Log::info('Records updated', ['updated_count' => $updated]);

            $token = Str::random(40);
            DB::table('supplier_bill_links')->insert([
                'token'         => $token,
                'bill_no'       => $finalBillNo,
                'sales_data'    => $salesRecords->toJson(),
                'advance_amount'=> $validated['advance_amount'],
                'supplier_code' => $validated['supplier_code'],
                'created_at'    => now(),
            ]);
            \Log::info('Public link created', ['token' => $token]);

            DB::commit();
            \Log::info('Transaction committed');

            if (!empty($validated['telephone_no'])) {
                \Log::info('Attempting to send SMS', [
                    'telephone' => $validated['telephone_no'],
                    'bill_no' => $finalBillNo
                ]);
                
                try {
                    $smsResult = $this->sendTextLKSMS($validated, $finalBillNo, $salesRecords, $token);
                    \Log::info('SMS function completed', ['result' => $smsResult]);
                } catch (\Exception $e) {
                    \Log::error('SMS sending failed', [
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                }
            } else {
                \Log::warning('No telephone number provided, SMS not sent');
            }

            return response()->json(['new_bill_no' => $finalBillNo, 'token' => $token]);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('marksuppliers error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    private function sendTextLKSMS($data, $billNo, $records, $token)
    {
        $total = $records->sum('SupplierTotal');
        $net = $total - $data['advance_amount'];
        
        $baseUrl = rtrim(env('APP_FRONTEND_URL'), '/');
        $url = "{$baseUrl}/view-supplier-bill/{$token}";

        $summary = $records->groupBy('item_name')->map(function ($group) {
            $weight = number_format($group->sum('weight'), 2);
            return $group->first()->item_name . ":" . $weight . "kg/" . $group->sum('packs');
        })->implode("\n");

        $message = "Supplier Bill\n" .  
                   "Bill #{$billNo}\n" .
                   "{$summary}\n" .
                   "Total: Rs. " . number_format($total, 2) . "\n" .
                   "Advance: Rs. " . number_format($data['advance_amount'], 2) . "\n" .  
                   "Net Payable: Rs. " . number_format($net, 2) . "\n" .
                   "View Bill: {$url}";

        $recipient = preg_replace('/[^0-9]/', '', $data['telephone_no']);
        
        \Log::info('Attempting to send SMS', [
            'bill_no' => $billNo,
            'recipient' => $recipient,
            'advance_amount' => $data['advance_amount'],
            'total' => $total,
            'net' => $net,
            'message' => $message,
            'api_key_present' => !empty(env('TEXTLK_SMS_API_KEY')),
            'sender_id' => env('TEXTLK_SMS_SENDER_ID')
        ]);

        try {
            $response = \Illuminate\Support\Facades\Http::withHeaders([
                'Authorization' => 'Bearer ' . env('TEXTLK_SMS_API_KEY'),
                'Accept'        => 'application/json',
            ])->post('https://app.text.lk/api/v3/sms/send', [
                'recipient' => $recipient,
                'sender_id' => env('TEXTLK_SMS_SENDER_ID'),
                'type'      => 'plain',
                'message'   => $message,
            ]);
            
            \Log::info('Text.lk API Response', [
                'status' => $response->status(),
                'body' => $response->json()
            ]);
            
            return $response;
        } catch (\Exception $e) {
            \Log::error('Text.lk API Error', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    public function getUnprintedDetails($supplierCode): JsonResponse
    {
        try {
            $details = Sale::select(
                'id', 
                'supplier_code',
                'customer_code',
                'item_name',
                'weight',
                'price_per_kg',
                'commission_amount',
                'total', 
                'packs',
                'bill_no', 
                'SupplierTotal', 
                'SupplierPricePerKg',
                'SupplierPackCost',
                'CustomerPackCost',
                'supplier_bill_printed',
                'supplier_bill_no',
                'loan_taken',
                DB::raw('DATE(created_at) as Date')
            )
            ->where('supplier_code', $supplierCode)
            ->where(function ($query) {
                $query->where('supplier_bill_printed', 'N')
                      ->orWhereNull('supplier_bill_printed');
            })
            ->whereNotNull('supplier_code') 
            ->get();

            return response()->json($details);

        } catch (\Exception $e) {
            Log::error("Error fetching unprinted details for supplier {$supplierCode}: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch unprinted details',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    public function getUnprintedDetails2($supplierCode): JsonResponse
    {
        try {
            $details = Sale::select(
                'id', 
                'supplier_code',
                'customer_code',
                'item_name',
                'weight',
                'price_per_kg',
                'commission_amount',
                'total', 
                'packs',
                'bill_no', 
                'SupplierTotal', 
                'SupplierPricePerKg',
                'SupplierPackCost',
                'supplier_bill_printed',
                'CustomerPackCost',
                'supplier_bill_no',
                'loan_taken',
                DB::raw('DATE(created_at) as Date')
            )
            ->where('supplier_code', $supplierCode)
            ->where('supplier_bill_printed', 'Y')
             ->where('loan_taken', 'Y')
            ->whereNotNull('supplier_code') 
            ->get();

            return response()->json($details);

        } catch (\Exception $e) {
            Log::error("Error fetching unprinted details for supplier {$supplierCode}: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch unprinted details',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    public function getBillDetails($billNo): JsonResponse
    {
        try {
            $details = Sale::select(
                'id',
                'supplier_code',
                'customer_code',
                'item_name',
                'weight',
                'price_per_kg',
                'commission_amount',
                'total', 
                'packs',
                'bill_no', 
                'SupplierTotal', 
                'SupplierPricePerKg',
                'CustomerPackCost',
                'SupplierPackCost',
                'supplier_bill_printed',
                'supplier_bill_no',
                DB::raw('DATE(created_at) as Date')
            )
            ->where('supplier_bill_no', $billNo)
            ->where('supplier_bill_printed', 'Y')
            ->get();

            return response()->json($details);

        } catch (\Exception $e) {
            Log::error("Error fetching details for bill {$billNo}: " . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch bill details',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    public function updateSupplier(Request $request, $id)
    {
        $request->validate([
            'supplier_code' => 'required|string',
            'customer_code' => 'nullable|string' 
        ]);

        $sale = Sale::findOrFail($id);
        
        $sale->supplier_code = $request->supplier_code;
        
        if ($request->filled('customer_code')) {
            $sale->customer_code = $request->customer_code;
        }
        
        $sale->save();

        return response()->json([
            'message' => 'Record updated successfully',
            'data' => $sale
        ], 200);
    }

    public function store2(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string',
            'advance_amount' => 'required|numeric|min:0',
        ]);

        $supplier = Supplier::updateOrCreate(
            ['code' => $validated['code']],
            ['advance_amount' => $validated['advance_amount']]
        );

        return response()->json([
            'message' => 'Supplier data saved successfully!',
            'data' => $supplier
        ], 200);
    }

    public function getByCode($code) {
        return Supplier::where('code', $code)->firstOrFail();
    }

    public function dobreport(Request $request)
    {
        $query = Supplier::query();

        if ($request->has('today_birthday') && $request->today_birthday == 'true') {
            $today = now()->format('m-d'); 
            $query->whereRaw("DATE_FORMAT(dob, '%m-%d') = ?", [$today]);
        } 
        elseif ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('dob', [$request->start_date, $request->end_date]);
        }

        $suppliers = $query->select('id', 'code', 'name', 'dob')->get();

        return response()->json($suppliers);
    }

    public function updatePhone(Request $request) {
        $validated = $request->validate([
            'code' => 'required|string',
            'telephone_no' => 'required|string',
        ]);

        $supplier = Supplier::updateOrCreate(
            ['code' => $validated['code']],
            ['telephone_no' => $validated['telephone_no']]
        );

        return response()->json([
            'message' => 'සැපයුම්කරුගේ දුරකථන අංකය යාවත්කාලීන විය!',
            'supplier' => $supplier
        ]);
    }

    public function resendSupplierSMS(Request $request)
    {
        \Log::info('resendSupplierSMS endpoint hit', [
            'request_data' => $request->all(),
            'headers' => $request->headers->all()
        ]);
        
        $validated = $request->validate([
            'bill_no' => 'required|string',
            'telephone_no' => 'required|string',
            'supplier_code' => 'required|string',
            'transaction_ids' => 'required|array',
            'advance_amount' => 'required|numeric',
            'is_reprint' => 'boolean'
        ]);

        try {
            $salesRecords = Sale::whereIn('id', $validated['transaction_ids'])->get();
            
            if ($salesRecords->isEmpty()) {
                return response()->json(['error' => 'No records found'], 404);
            }

            \Log::info('Sales records fetched for reprint', [
                'count' => $salesRecords->count(),
                'bill_no' => $validated['bill_no']
            ]);

            $existingLink = DB::table('supplier_bill_links')
                ->where('bill_no', $validated['bill_no'])
                ->first();

            if ($existingLink) {
                DB::table('supplier_bill_links')
                    ->where('bill_no', $validated['bill_no'])
                    ->update([
                        'sales_data' => $salesRecords->toJson(),
                        'advance_amount' => $validated['advance_amount'],
                        'supplier_code' => $validated['supplier_code'],
                        'updated_at' => now(),
                    ]);
                
                $token = $existingLink->token;
                \Log::info('Updated existing bill link with current data', [
                    'bill_no' => $validated['bill_no'],
                    'token' => $token
                ]);
            } else {
                $token = $this->createNewBillLink($validated, $salesRecords);
            }

            $smsResult = $this->sendReprintSMS($validated, $salesRecords, $token);

            return response()->json([
                'success' => true,
                'message' => 'SMS sent successfully with updated bill data',
                'token' => $token
            ]);

        } catch (\Exception $e) {
            \Log::error('resendSupplierSMS error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    private function createNewBillLink($data, $records)
    {
        $token = Str::random(40);
        
        DB::table('supplier_bill_links')->insert([
            'token' => $token,
            'bill_no' => $data['bill_no'],
            'sales_data' => $records->toJson(),
            'advance_amount' => $data['advance_amount'],
            'supplier_code' => $data['supplier_code'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        return $token;
    }

    private function sendReprintSMS($data, $records, $token)
    {
        $total = $records->sum('SupplierTotal');
        $net = $total - $data['advance_amount'];
        
        $baseUrl = rtrim(env('APP_FRONTEND_URL'), '/');
        $url = "{$baseUrl}/view-supplier-bill/{$token}";

        $summary = $records->groupBy('item_name')->map(function ($group) {
            $weight = number_format($group->sum('weight'), 2);
            $packs = $group->sum('packs');
            return $group->first()->item_name . ":" . $weight . "kg/" . $packs;
        })->implode("\n");

        if (isset($data['is_reprint']) && $data['is_reprint']) {
            $message = "🔄 REPRINT - Supplier Bill (UPDATED)\n" .
                       "Bill #{$data['bill_no']} (Reprinted)\n" .
                       "{$summary}\n" .
                       "Total: Rs. " . number_format($total, 2) . "\n" .
                       "Advance: Rs. " . number_format($data['advance_amount'], 2) . "\n" .
                       "Net: Rs. " . number_format($net, 2) . "\n" .
                       "View Updated Bill: {$url}\n" .
                       "Please check the updated details.";
        } else {
            $message = "Supplier Bill\n" .
                       "Bill #{$data['bill_no']}\n" .
                       "{$summary}\n" .
                       "Total: Rs. " . number_format($total, 2) . "\n" .
                       "Advance: Rs. " . number_format($data['advance_amount'], 2) . "\n" .
                       "Net: Rs. " . number_format($net, 2) . "\n" .
                       "View Bill: {$url}";
        }

        $recipient = preg_replace('/[^0-9]/', '', $data['telephone_no']);
        
        \Log::info('Attempting to send reprint SMS with updated data', [
            'bill_no' => $data['bill_no'],
            'recipient' => $recipient,
            'advance_amount' => $data['advance_amount'],
            'total' => $total,
            'net' => $net,
            'is_reprint' => $data['is_reprint'] ?? false
        ]);

        try {
            $response = \Illuminate\Support\Facades\Http::withHeaders([
                'Authorization' => 'Bearer ' . env('TEXTLK_SMS_API_KEY'),
                'Accept' => 'application/json',
            ])->post('https://app.text.lk/api/v3/sms/send', [
                'recipient' => $recipient,
                'sender_id' => env('TEXTLK_SMS_SENDER_ID'),
                'type' => 'plain',
                'message' => $message,
            ]);
            
            \Log::info('Text.lk API Response for reprint', [
                'status' => $response->status(),
                'body' => $response->json()
            ]);
            
            return $response;
        } catch (\Exception $e) {
            \Log::error('Text.lk API Error for reprint', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    public function bulkUpdateSupplier(Request $request)
    {
        $validated = $request->validate([
            'transaction_ids' => 'required|array',
            'transaction_ids.*' => 'exists:sales,id',
            'supplier_code'   => 'required|string',
            'customer_code'   => 'nullable|string'
        ]);

        try {
            $updateData = [
                'supplier_code' => strtoupper($validated['supplier_code']),
            ];

            if ($request->filled('customer_code')) {
                $updateData['customer_code'] = strtoupper($validated['customer_code']);
            }

            $updatedCount = Sale::whereIn('id', $validated['transaction_ids'])
                ->update($updateData);

            return response()->json([
                'message' => 'ගනුදෙනු ' . $updatedCount . ' ක් යාවත්කාලීන කරන ලදී.',
                'updated_count' => $updatedCount
            ], 200);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}