<?php

namespace App\Http\Controllers;

use App\Mail\DayEndWeightReportMail;
use App\Models\GrnEntry;
use App\Models\Supplier;
use App\Models\Sale;
use App\Models\Item;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Salesadjustment;
use App\Models\SalesHistory;
use Carbon\Carbon;
use App\Models\Setting;
use App\Models\CustomersLoan;
use Illuminate\Http\JsonResponse;
use App\Models\Commission;
use Illuminate\Support\Str;
use Twilio\Rest\Client;
use TextLK\SMS\TextLKSMSMessage;

class SalesEntryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $currentUser = auth()->user();

            if (!$currentUser) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            $query = Sale::with(['customer']);

            if ($currentUser->role === 'User') {
                $query->where('UniqueCode', $currentUser->user_id);
            }

            $sales = $query->get();

            $printedSales = $sales->where('bill_printed', 'Y')->values();
            $unprintedSales = $sales->where('bill_printed', 'N')->values();

            return response()->json([
                'sales' => $sales,
                'printed_sales' => $printedSales,
                'unprinted_sales' => $unprintedSales,
            ]);

        } catch (\Exception $e) {
            Log::error('SalesEntryController@index FAILED', [
                'message' => $e->getMessage(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'error' => 'Failed to fetch sales data.'
            ], 500);
        }
    }

    public function create()
    {
        $suppliers = Supplier::all();
        $items = GrnEntry::select('item_name', 'item_code', 'code')
            ->where('is_hidden', 0)
            ->distinct()
            ->get();
        $entries = GrnEntry::where('is_hidden', 0)->get();

        $itemsWithPackCost = Item::select('no', 'pack_due')->get();
        $itemPackCosts = [];
        foreach ($itemsWithPackCost as $item) {
            $itemPackCosts[$item->no] = $item->pack_due;
        }

        $sales = Sale::where('Processed', 'N')->get();

        foreach ($sales as $sale) {
            $sale->pack_due = $itemPackCosts[$sale->item_code] ?? 0;
        }

        $customers = Customer::all();
        $totalSum = $sales->sum('total');

        $unprocessedSales = Sale::whereIn('Processed', ['Y', 'N'])->get();

        foreach ($unprocessedSales as $sale) {
            $sale->pack_due = $itemPackCosts[$sale->item_code] ?? 0;
        }

        $salesPrinted = Sale::where('bill_printed', 'Y')
            ->orderBy('created_at', 'desc')
            ->orderBy('bill_no')
            ->get()
            ->groupBy('customer_code');

        foreach ($salesPrinted as $customerSales) {
            foreach ($customerSales as $sale) {
                $sale->pack_due = $itemPackCosts[$sale->item_code] ?? 0;
            }
        }

        $totalUnprocessedSum = $unprocessedSales->sum('total');

        $salesNotPrinted = Sale::where('bill_printed', 'N')
            ->orderBy('customer_code')
            ->get()
            ->groupBy('customer_code');

        foreach ($salesNotPrinted as $customerSales) {
            foreach ($customerSales as $sale) {
                $sale->pack_due = $itemPackCosts[$sale->item_code] ?? 0;
            }
        }

        $billDate = Setting::value('value');
        $totalUnprintedSum = Sale::where('bill_printed', 'N')->sum('total');

        $lastDayStartedSetting = Setting::where('key', 'last_day_started_date')->first();
        $lastDayStartedDate = $lastDayStartedSetting ? Carbon::parse($lastDayStartedSetting->value) : null;
        $nextDay = $lastDayStartedDate ? $lastDayStartedDate->addDay() : Carbon::now();

        $codes = Sale::select('code')->distinct()->orderBy('code')->get();

        $salesArray = Sale::all();
        foreach ($salesArray as $sale) {
            $sale->pack_due = $itemPackCosts[$sale->item_code] ?? 0;
        }

        return view('dashboard', compact(
            'suppliers', 'items', 'entries', 'sales', 'customers', 'totalSum',
            'unprocessedSales', 'salesPrinted', 'totalUnprocessedSum',
            'salesNotPrinted', 'totalUnprintedSum', 'nextDay', 'codes',
            'billDate', 'salesArray', 'itemsWithPackCost'
        ));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_code' => 'required|string|max:255',
            'customer_code' => 'required|string|max:255',
            'customer_name' => 'nullable|string|max:255',
            'item_code' => 'required|string|exists:items,no',
            'item_name' => 'required|string|max:255',
            'weight' => 'required|numeric',
            'price_per_kg' => 'required|numeric',
            'pack_due' => 'nullable|numeric',
            'total' => 'required|numeric',
            'packs' => 'required|numeric',
            'given_amount' => 'nullable|numeric',
            'bill_no' => 'nullable|string|max:255',
            'bill_printed' => 'nullable|string|in:N,Y',
            'kuliya' => 'nullable|numeric',
            'nattami' => 'nullable|numeric',
        ]);

        try {
            DB::beginTransaction();

            $item = Item::where('no', $validated['item_code'])->first();
            if (!$item) {
                return response()->json(['error' => 'Item not found.'], 422);
            }

            $bagWeightPerUnit = (float) ($item->bag_real_price ?? 0);
            $numPacks = (int) $validated['packs'];
            $pricePerKg = (float) $validated['price_per_kg'];

            $totalBagWeight = $bagWeightPerUnit * $numPacks;
            $incomingNetWeight = (float) $validated['weight'] - $totalBagWeight;
            $recalculatedIncomingTotal = $incomingNetWeight * $pricePerKg;

            $kuliya = $request->filled('kuliya')
                ? (float) $validated['kuliya']
                : $this->calculateKuliya($validated['item_code'], $validated['item_name'], $incomingNetWeight);

            $nattami = $request->filled('nattami') ? (float) $validated['nattami'] : 0.00;

            $billPrinted = $validated['bill_printed'] ?? null;

            $currentEntry = [
                'time' => now('Asia/Colombo')->format('h:i A'),
                'weight' => (float) $validated['weight'],
                'packs' => $numPacks
            ];

            $shouldCheckForUpdate = ($billPrinted === null || $billPrinted === 'N') && $pricePerKg == 0;

            if ($shouldCheckForUpdate) {
                $existingSale = Sale::where('customer_code', strtoupper($validated['customer_code']))
                    ->where('item_code', $validated['item_code'])
                    ->where('supplier_code', $validated['supplier_code'])
                    ->where(function ($query) {
                        $query->where('bill_printed', 'N')->orWhereNull('bill_printed');
                    })
                    ->where('price_per_kg', 0)
                    ->where('Processed', 'N')
                    ->orderBy('created_at', 'desc')
                    ->first();

                if ($existingSale) {
                    $newWeight = $existingSale->weight + $incomingNetWeight;
                    $newPacks = $existingSale->packs + $numPacks;
                    $newTotal = $newWeight * 0;

                    $updatedKuliya = $request->filled('kuliya')
                        ? (float) $validated['kuliya']
                        : $this->calculateKuliya($validated['item_code'], $validated['item_name'], $newWeight);

                    $history = $existingSale->breakdown_history;
                    if (is_string($history)) {
                        $history = json_decode($history, true);
                    }
                    if (!is_array($history)) {
                        $history = [
                            [
                                'time' => $existingSale->created_at->format('h:i A'),
                                'weight' => (float) $existingSale->weight,
                                'packs' => (int) $existingSale->packs
                            ]
                        ];
                    }

                    $history[] = $currentEntry;

                    $existingSale->update([
                        'weight' => $newWeight,
                        'packs' => $newPacks,
                        'total' => $newTotal,
                        'SupplierTotal' => 0,
                        'profit' => 0,
                        'breakdown_history' => $history,
                        'bag_real_weight' => $bagWeightPerUnit,
                        'Kuliya' => $updatedKuliya,
                        'Nattami' => $nattami,
                        'updated_at' => now(),
                    ]);

                    DB::commit();
                    return response()->json([
                        'success' => true,
                        'message' => 'Existing record updated',
                        'data' => $existingSale->fresh()
                    ]);
                }
            }

            // Flat 10% commission logic
            $commissionAmount = $pricePerKg * 0.10;

            $customerPackCost = $item->pack_cost ?? 0;
            $customerPackLabour = $item->pack_due ?? 0;

            $supplierPricePerKg = abs($pricePerKg - $commissionAmount);

            $supplierTotal = $incomingNetWeight * $supplierPricePerKg;
            $profit = $recalculatedIncomingTotal - $supplierTotal;

            $settingDate = Setting::value('value') ?? now()->toDateString();

            $sale = Sale::create([
                'supplier_code' => $validated['supplier_code'],
                'customer_code' => strtoupper($validated['customer_code']),
                'customer_name' => $validated['customer_name'],
                'item_code' => $validated['item_code'],
                'item_name' => $validated['item_name'],
                'weight' => $incomingNetWeight,
                'price_per_kg' => $pricePerKg,
                'pack_due' => $validated['pack_due'] ?? 0,
                'total' => $recalculatedIncomingTotal,
                'packs' => $numPacks,
                'CustomerPackCost' => $customerPackCost,
                'CustomerPackLabour' => $customerPackLabour,
                'SupplierWeight' => $incomingNetWeight,
                'SupplierPricePerKg' => $supplierPricePerKg,
                'SupplierTotal' => $supplierTotal,
                'SupplierPackCost' => $customerPackCost,
                'SupplierPackLabour' => $customerPackLabour,
                'profit' => $profit,
                'breakdown_history' => [$currentEntry],
                'Processed' => 'N',
                'CustomerBillEnteredOn' => now(),
                'UniqueCode' => auth()->user()->user_id,
                'Date' => $settingDate,
                'ip_address' => $request->ip(),
                'given_amount' => $validated['given_amount'] ?? null,
                'bill_printed' => $billPrinted,
                'bill_no' => $validated['bill_no'] ?? null,
                'commission_amount' => $commissionAmount,
                'bag_real_weight' => $bagWeightPerUnit,
                'Kuliya' => $kuliya,
                'Nattami' => $nattami,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'New record created with updated total',
                'data' => $sale->fresh()
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Sales Entry Failed: ' . $e->getMessage());

            return response()->json([
                'error' => 'Failed: ' . $e->getMessage()
            ], 422);
        }
    }

    public function markAllAsProcessed(Request $request)
    {
        try {
            DB::beginTransaction();

            Sale::where('Processed', 'N')->update([
                'Processed' => 'Y',
                'bill_printed' => DB::raw("IFNULL(bill_printed, 'N')")
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'All sales marked as processed.'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function markAsPrinted(Request $request)
    {
        $salesIds = $request->input('sales_ids');
        if (empty($salesIds)) {
            return response()->json(['status' => 'error', 'message' => 'No sales IDs provided.'], 400);
        }

        try {
            $existingBillNo = Sale::whereIn('id', $salesIds)
                ->where('processed', 'Y')
                ->whereNotNull('bill_no')
                ->first()?->bill_no;

            $billNoToUse = $existingBillNo ?: $this->generateNewBillNumber();
            $salesRecords = null;

            DB::transaction(function () use ($salesIds, $billNoToUse, &$salesRecords) {
                $salesRecords = Sale::whereIn('id', $salesIds)->get();
                foreach ($salesRecords as $sale) {
                    if ($sale->bill_printed === 'Y') {
                        $sale->BillReprintAfterChanges = now();
                    }
                    $sale->bill_printed = 'Y';
                    $sale->processed = 'Y';
                    $sale->bill_no = $billNoToUse;
                    $sale->FirstTimeBillPrintedOn = $sale->FirstTimeBillPrintedOn ?? now();
                    $sale->save();
                }
            });

            $itemsForSummary = Sale::whereIn('id', $salesIds)->get();
            $billFinalTotal = $itemsForSummary->sum(function ($item) {
                return (float) $item->total + (float) $item->CustomerPackCost;
            });

            $summaryString = $itemsForSummary->groupBy('item_code')->map(function ($group) {
                $itemName = $group->first()->item_name;
                $itemCode = $group->first()->item_code;
                $totalWeight = $group->sum('weight');
                $totalPacks = $group->sum('packs');
                return "{$itemName}({$itemCode})={$totalWeight}/{$totalPacks}";
            })->implode("\n");

            $formattedSalesData = [];
            foreach ($salesRecords as $sale) {
                $formattedSalesData[] = [
                    'id' => $sale->id,
                    'item_name' => $sale->item_name,
                    'item_code' => $sale->item_code,
                    'weight' => (float) $sale->weight,
                    'price_per_kg' => (float) $sale->price_per_kg,
                    'packs' => (int) $sale->packs,
                    'supplier_code' => $sale->supplier_code,
                    'customer_code' => $sale->customer_code,
                    'total' => (float) $sale->total,
                    'SupplierTotal' => (float) $sale->SupplierTotal,
                    'SupplierPricePerKg' => (float) $sale->SupplierPricePerKg,
                    'CustomerPackCost' => (float) ($sale->CustomerPackCost ?? 0),
                    'Kuliya' => (float) ($sale->Kuliya ?? 0),
                    'Nattami' => (float) ($sale->Nattami ?? 0),
                    'commission_amount' => (float) ($sale->commission_amount ?? 0),
                ];
            }

            $token = Str::random(40);
            $baseUrl = env('APP_FRONTEND_URL', 'https://goviraju.lk/DBS_30500/');
            $publicUrl = rtrim($baseUrl, '/') . "/view-bill/" . $token;

            DB::table('bill_links')->insert([
                'token' => $token,
                'bill_no' => $billNoToUse,
                'sales_data' => json_encode($formattedSalesData),
                'loan_amount' => $request->loan_amount ?? 0,
                'customer_name' => $request->customer_name,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            $to = $request->telephone_no;
            $customerCode = $request->customer_code ?? $request->customer_name ?? ($salesRecords->first()->customer_code ?? null);

            if (empty($to) && !empty($customerCode)) {
                $customer = Customer::where('short_name', $customerCode)->first();
                if ($customer) {
                    $to = $customer->telephone_no;
                }
            }

            if (!empty($to)) {
                try {
                    $to = preg_replace('/[^0-9]/', '', $to);
                    if (str_starts_with($to, '0')) {
                        $to = '94' . substr($to, 1);
                    }
                    $messageBody = "Customer Bill,\nHello {$customerCode},\nBill #{$billNoToUse} Summary:\n{$summaryString}\nBill Final Total: " . number_format($billFinalTotal, 2) . "\nView: {$publicUrl}";
                    $textLKSMS = new TextLKSMSMessage();
                    $textLKSMS->recipient($to)->message($messageBody)->senderId(env('TEXTLK_SENDER_ID', 'TextLKDemo'))->apiKey(env('TEXTLK_API_KEY'))->send();
                } catch (\Exception $e) {
                    Log::error("SMS Error: " . $e->getMessage());
                }
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Sales processed and SMS sent via Text.lk!',
                'bill_no' => $billNoToUse,
                'bill_link' => $publicUrl
            ]);

        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Failed to update records.'], 500);
        }
    }

    private function generateNewBillNumber()
    {
        return \DB::transaction(function () {
            $bill = \App\Models\BillNumber::lockForUpdate()->first();
            if (!$bill) {
                $bill = \App\Models\BillNumber::create(['last_bill_no' => 999]);
            }
            $bill->last_bill_no += 1;
            $bill->save();
            return $bill->last_bill_no;
        });
    }

    public function update(Request $request, Sale $sale)
    {
        $validatedData = $request->validate([
            'customer_code' => 'required|string|max:255',
            'customer_name' => 'nullable|string|max:255',
            'supplier_code' => 'nullable|string|max:255',
            'item_code' => 'required|string|max:255',
            'item_name' => 'required|string|max:255',
            'weight' => 'required|numeric|min:0',
            'price_per_kg' => 'required|numeric|min:0',
            'pack_due' => 'nullable|numeric|min:0',
            'total' => 'required|numeric|min:0',
            'packs' => 'required|integer|min:0',
            'given_amount' => 'nullable|numeric|min:0',
            'bill_no' => 'nullable|string|max:255',
            'bill_printed' => 'nullable|string|in:N,Y',
            'update_related_price' => 'nullable|boolean',
            'kuliya' => 'nullable|numeric',
            'nattami' => 'nullable|numeric',
        ]);

        DB::beginTransaction();
        $affectedSales = [];
        $originalData = $sale->toArray();

        try {
            $settingDate = Setting::value('value');
            $formattedDate = \Carbon\Carbon::parse($settingDate)->format('Y-m-d');

            $newPricePerKg = $validatedData['price_per_kg'];
            
            // Flat 10% commission logic
            $commissionAmount = $newPricePerKg * 0.10;

            $item = Item::where('no', $validatedData['item_code'])->first();
            if (!$item) {
                throw new \Exception('Item not found for calculation.');
            }

            $newBagPrice = (float) ($item->pack_cost ?? 0);

            $supplierPricePerKg = abs($newPricePerKg - $commissionAmount);
            $newSupplierTotal = $validatedData['weight'] * $supplierPricePerKg;
            $newTotal = ($validatedData['weight'] * $newPricePerKg) + ($validatedData['packs'] * $newBagPrice);
            $newProfit = $newTotal - $newSupplierTotal;

            $bagWeightPerUnit = (float) ($item->bag_real_price ?? 0);
            $totalBagWeight = $bagWeightPerUnit * $validatedData['packs'];
            $incomingNetWeight = $validatedData['weight'] - $totalBagWeight;

            $kuliya = $request->filled('kuliya')
                ? (float) $validatedData['kuliya']
                : $this->calculateKuliya($validatedData['item_code'], $validatedData['item_name'], $incomingNetWeight);

            $nattami = $request->filled('nattami') ? (float) $validatedData['nattami'] : 0.00;

            if ($originalData['bill_printed'] === 'Y') {
                Salesadjustment::create([
                    'customer_code' => $originalData['customer_code'],
                    'supplier_code' => $originalData['supplier_code'] ?? null,
                    'code' => $originalData['item_code'],
                    'item_code' => $originalData['item_code'],
                    'item_name' => $originalData['item_name'],
                    'weight' => $originalData['weight'],
                    'price_per_kg' => $originalData['price_per_kg'],
                    'pack_due' => $originalData['pack_due'] ?? 0,
                    'total' => $originalData['total'],
                    'packs' => $originalData['packs'],
                    'bill_no' => $originalData['bill_no'],
                    'user_id' => 'c11',
                    'type' => 'original',
                    'original_created_at' => \Carbon\Carbon::parse($sale->Date)
                        ->setTimeFrom(\Carbon\Carbon::parse($sale->created_at))
                        ->format('Y-m-d H:i:s'),
                    'original_updated_at' => $sale->updated_at,
                    'Date' => $formattedDate,
                ]);
            }

            $sale->update([
                'customer_code' => $validatedData['customer_code'],
                'customer_name' => $validatedData['customer_name'] ?? $sale->customer_name,
                'code' => $validatedData['item_code'],
                'supplier_code' => $validatedData['supplier_code'] ?? $sale->supplier_code,
                'item_code' => $validatedData['item_code'],
                'item_name' => $validatedData['item_name'],
                'weight' => $validatedData['weight'],
                'packs' => $validatedData['packs'],
                'price_per_kg' => $newPricePerKg,
                'commission_amount' => $commissionAmount,
                'SupplierPricePerKg' => $supplierPricePerKg,
                'SupplierTotal' => $newSupplierTotal,
                'pack_due' => $newBagPrice,
                'CustomerPackLabour' => $newBagPrice,
                'CustomerPackCost' => $newBagPrice,
                'total' => $newTotal,
                'profit' => $newProfit,
                'given_amount' => $validatedData['given_amount'] ?? $sale->given_amount,
                'bill_no' => $validatedData['bill_no'] ?? $sale->bill_no,
                'bill_printed' => $validatedData['bill_printed'] ?? $sale->bill_printed,
                'Kuliya' => $kuliya,
                'Nattami' => $nattami,
                'updated' => 'Y',
                'BillChangedOn' => now(),
            ]);

            if ($request->input('update_related_price') === true) {
                $customerCode = $validatedData['customer_code'];
                $itemCode = $validatedData['item_code'];
                $supplierCode = $validatedData['supplier_code'] ?? $sale->supplier_code;

                $updateQuery = Sale::where('customer_code', $customerCode)
                    ->where('item_code', $itemCode)
                    ->where('supplier_code', $supplierCode)
                    ->where('id', '!=', $sale->id);

                if ($sale->bill_printed === 'Y' && $sale->bill_no) {
                    $updateQuery->where('bill_printed', 'Y')->where('bill_no', $sale->bill_no);
                } else {
                    $updateQuery->where(function ($query) {
                        $query->where('bill_printed', 'N')->orWhereNull('bill_printed');
                    });
                }

                $updateQuery->update([
                    'item_code' => $itemCode,
                    'item_name' => $validatedData['item_name'],
                    'price_per_kg' => $newPricePerKg,
                    'commission_amount' => $commissionAmount,
                    'SupplierPricePerKg' => $supplierPricePerKg,
                    'pack_due' => $newBagPrice,
                    'CustomerPackLabour' => $newBagPrice,
                    'CustomerPackCost' => $newBagPrice,
                    'Kuliya' => $kuliya,
                    'Nattami' => $nattami,
                    'total' => DB::raw("weight * $newPricePerKg + packs * $newBagPrice"),
                    'SupplierTotal' => DB::raw("weight * $supplierPricePerKg"),
                    'profit' => DB::raw("(weight * $newPricePerKg + packs * $newBagPrice) - (weight * $supplierPricePerKg)"),
                    'updated' => 'Y',
                ]);

                $affectedSales = Sale::where('customer_code', $customerCode)
                    ->where('item_code', $itemCode)
                    ->where('supplier_code', $supplierCode);

                if ($sale->bill_printed === 'Y' && $sale->bill_no) {
                    $affectedSales->where('bill_printed', 'Y')->where('bill_no', $sale->bill_no);
                } else {
                    $affectedSales->where(function ($query) {
                        $query->where('bill_printed', 'N')->orWhereNull('bill_printed');
                    });
                }
                $affectedSales = $affectedSales->get();
            } else {
                $affectedSales = collect([$sale->fresh()]);
            }

            $this->updateGrnRemainingStock($validatedData['item_code']);

            if ($originalData['bill_printed'] === 'Y') {
                $newData = $sale->fresh();
                Salesadjustment::create([
                    'customer_code' => $newData['customer_code'],
                    'supplier_code' => $newData['supplier_code'] ?? null,
                    'code' => $newData['item_code'],
                    'item_code' => $newData['item_code'],
                    'item_name' => $newData['item_name'],
                    'weight' => $newData['weight'],
                    'price_per_kg' => $newData['price_per_kg'],
                    'pack_due' => $newData['pack_due'] ?? 0,
                    'total' => $newData['total'],
                    'packs' => $newData['packs'],
                    'bill_no' => $newData['bill_no'],
                    'user_id' => 'c11',
                    'type' => 'updated',
                    'original_created_at' => \Carbon\Carbon::parse($sale->Date)
                        ->setTimeFrom(\Carbon\Carbon::parse($sale->created_at))
                        ->format('Y-m-d H:i:s'),
                    'original_updated_at' => $sale->updated_at,
                    'Date' => $formattedDate,
                ]);
            }

            DB::commit();
            return response()->json(['success' => true, 'sales' => $affectedSales->toArray()]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update sales record: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    private function calculateKuliya($itemCode, $itemName, $weight)
    {
        if (str_starts_with($itemCode, '/')) {
            return 50;
        } elseif (str_contains($itemName, 'කෙසෙල්')) {
            return 1.50;
        } else {
            if ($weight >= 1 && $weight <= 9) {
                return 0;
            } elseif ($weight >= 10 && $weight <= 19) {
                return 20;
            } elseif ($weight >= 20 && $weight <= 49) {
                return 40;
            } elseif ($weight >= 50 && $weight <= 99) {
                return 50;
            } elseif ($weight >= 100) {
                return $weight;
            }
            return 0;
        }
    }

    public function calculateKuliyaApi(Request $request)
    {
        $request->validate([
            'item_code' => 'required|string',
            'item_name' => 'required|string',
            'weight' => 'required|numeric',
            'packs' => 'required|numeric',
            'bag_real_weight' => 'nullable|numeric',
        ]);

        $bagWeightPerUnit = (float) ($request->bag_real_weight ?? 0);
        $numPacks = (int) $request->packs;
        $totalBagWeight = $bagWeightPerUnit * $numPacks;
        $incomingNetWeight = (float) $request->weight - $totalBagWeight;

        $kuliya = $this->calculateKuliya(
            $request->item_code,
            $request->item_name,
            $incomingNetWeight
        );

        return response()->json(['kuliya' => $kuliya]);
    }

    public function destroy(Sale $sale)
    {
        try {
            $settingDate = Setting::value('value') ?? now();
            $formattedDate = Carbon::parse($settingDate)->format('Y-m-d');

            if ($sale->bill_printed === 'Y') {
                $adjustmentData = [
                    'customer_code' => $sale->customer_code,
                    'supplier_code' => $sale->supplier_code,
                    'code' => $sale->item_code,
                    'item_code' => $sale->item_code,
                    'item_name' => $sale->item_name,
                    'weight' => $sale->weight,
                    'price_per_kg' => $sale->price_per_kg,
                    'total' => $sale->total,
                    'packs' => $sale->packs,
                    'bill_no' => $sale->bill_no,
                    'original_created_at' => $sale->created_at,
                    'Date' => $formattedDate,
                ];

                Salesadjustment::create($adjustmentData + ['type' => 'original']);
                Salesadjustment::create($adjustmentData + ['type' => 'deleted']);
            }

            $saleCode = $sale->code;
            $sale->delete();
            $this->updateGrnRemainingStock($saleCode);

            return response()->json([
                'success' => true,
                'message' => 'Sales record deleted successfully.'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while deleting the sale.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function updateGrnRemainingStock(): void
    {
        $grnEntriesByCode = GrnEntry::all()->groupBy('code');
        $currentSales = Sale::all()->groupBy('code');
        $historicalSales = SalesHistory::all()->groupBy('code');

        foreach ($grnEntriesByCode as $grnCode => $entries) {
            $totalOriginalPacks = $entries->sum('original_packs');
            $totalOriginalWeight = $entries->sum('original_weight');
            $totalWastedPacks = $entries->sum('wasted_packs');
            $totalWastedWeight = $entries->sum('wasted_weight');

            $totalSoldPacks = 0;
            if (isset($currentSales[$grnCode])) {
                $totalSoldPacks += $currentSales[$grnCode]->sum('packs');
            }
            if (isset($historicalSales[$grnCode])) {
                $totalSoldPacks += $historicalSales[$grnCode]->sum('packs');
            }

            $totalSoldWeight = 0;
            if (isset($currentSales[$grnCode])) {
                $totalSoldWeight += $currentSales[$grnCode]->sum('weight');
            }
            if (isset($historicalSales[$grnCode])) {
                $totalSoldWeight += $historicalSales[$grnCode]->sum('weight');
            }

            $remainingPacks = $totalOriginalPacks - $totalSoldPacks - $totalWastedPacks;
            $remainingWeight = $totalOriginalWeight - $totalSoldWeight - $totalWastedWeight;

            foreach ($entries as $grnEntry) {
                $grnEntry->packs = max($remainingPacks, 0);
                $grnEntry->weight = max($remainingWeight, 0);
                $grnEntry->save();
            }
        }
    }

    public function saveAsUnprinted(Request $request)
    {
        $validated = $request->validate([
            'sale_ids' => 'required|array',
            'sale_ids.*' => 'integer|exists:sales,id',
        ]);

        if (!empty($validated['sale_ids'])) {
            Sale::whereIn('id', $validated['sale_ids'])->update(['is_printed' => 0]);
        }
        return response()->json(['success' => true]);
    }

    public function getUnprintedSales($customer_code)
    {
        $sales = Sale::where('customer_code', $customer_code)->where('bill_printed', 'N')->get();
        return response()->json($sales);
    }

    public function getAllSalesData()
    {
        try {
            $allSales = Sale::all();
            return response()->json($allSales);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to retrieve sales data.'], 500);
        }
    }

    public function getAllSales()
    {
        $sales = Sale::all();
        return response()->json(['sales' => $sales]);
    }

    public function getLoanAmount(Request $request)
    {
        $request->validate(['customer_short_name' => 'required|string']);
        $customerShortName = $request->input('customer_short_name');

        $oldSum = CustomersLoan::where('customer_short_name', $customerShortName)->where('loan_type', 'old')->sum('amount');
        $todaySum = CustomersLoan::where('customer_short_name', $customerShortName)->where('loan_type', 'today')->sum('amount');

        $totalLoanAmount = ($todaySum == 0) ? $oldSum : ($todaySum - $oldSum);

        return response()->json(['total_loan_amount' => $totalLoanAmount]);
    }

    public function updateGivenAmount(Request $request, Sale $sale)
    {
        $validated = $request->validate([
            'given_amount' => 'required|numeric|min:0',
            'credit_transaction' => 'sometimes|string|in:Y,N',
        ]);

        $sale->update([
            'given_amount' => $validated['given_amount'],
            'credit_transaction' => $request->get('credit_transaction', 'N'),
        ]);

        return response()->json([
            'status' => 'success',
            'sale' => $sale->fresh()
        ]);
    }

    public function processDay(Request $request)
    {
        $recipientEmail = 'nethmavilhan@gmail.com';
        $processLogDate = $request->input('date') ?? now()->toDateString();
        $lastSetting = \App\Models\Setting::where('key', 'last_day_started_date')->first();
        $adjustmentDate = $lastSetting ? $lastSetting->value : $processLogDate;

        $allSales = Sale::all();
        $totalRecordsToMove = $allSales->count();

        if ($totalRecordsToMove === 0) {
            return response()->json(['success' => false, 'message' => "Sales table is empty."], 404);
        }

        $adjustments = Salesadjustment::whereDate('Date', $adjustmentDate)->orderBy('created_at', 'desc')->get();
        Supplier::whereDate('advance_created_date', $processLogDate)->update(['advance_amount' => 0, 'advance_created_date' => null]);

        $summarizedSales = Sale::selectRaw("item_code, item_name, SUM(packs) AS packs, SUM(weight) AS weight, SUM(total) AS total")
            ->groupBy('item_code', 'item_name')->orderBy('item_name', 'asc')->get();

        $summarizedSales = $summarizedSales->map(function ($sale) {
            $item = \App\Models\Item::where('no', $sale->item_code)->first();
            $sale->pack_due = $item ? $item->pack_due : 0;
            return $sale;
        });

        $groupedSales = $allSales->groupBy('customer_code')->map(function ($customerSales) {
            return $customerSales->groupBy('bill_no');
        });

        $supplierReport = \App\Models\Sale::select([
            'supplier_code', 'customer_code', 'item_code', 'item_name', 'SupplierWeight',
            'SupplierPricePerKg', 'SupplierTotal', 'SupplierPackCost', 'SupplierPackLabour',
            'profit', 'supplier_bill_printed', 'supplier_bill_no', 'Date'
        ])->orderBy('Date', 'desc')->get()->groupBy('supplier_code');

        $totals = $summarizedSales->reduce(function ($acc, $sale) {
            $acc['total_weight'] += (float) $sale->weight;
            $acc['total_net_total'] += ((float) $sale->total - ((float) $sale->packs * (float) $sale->pack_due));
            return $acc;
        }, ['total_weight' => 0.0, 'total_net_total' => 0.0]);

        $reportData = [
            'processLogDate' => $processLogDate,
            'adjustmentDate' => $adjustmentDate,
            'totalRecordsMoved' => $totalRecordsToMove,
            'sales' => $summarizedSales,
            'raw_sales' => $allSales,
            'grouped_sales' => $groupedSales,
            'adjustments' => $adjustments,
            'supplier_report' => $supplierReport,
            'totals' => $totals,
        ];

        \DB::beginTransaction();
        try {
            $historyData = [];
            $allowedColumns = (new \App\Models\Sale())->getFillable();

            foreach ($allSales as $sale) {
                $data = $sale->only($allowedColumns);
                unset($data['id']);
                $data['bag_real_weight'] = $sale->bag_real_weight ?? 0;
                foreach ($data as $key => $value) {
                    if (is_array($value)) $data[$key] = json_encode($value);
                }
                $historyData[] = $data;
            }

            \App\Models\SalesHistory::insert($historyData);
            \App\Models\Sale::query()->delete();

            \App\Models\Setting::updateOrCreate(
                ['key' => 'last_day_started_date'],
                ['value' => $processLogDate]
            );

            \DB::commit();

            try {
                \Mail::to($recipientEmail)->send(new DayEndWeightReportMail($reportData));
            } catch (\Exception $e) {}

            return response()->json(['success' => true, 'message' => "Process complete.", 'saved_date' => $processLogDate]);
        } catch (\Exception $e) {
            \DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function viewPublicBill($token)
    {
        $bill = DB::table('bill_links')->where('token', $token)->first();
        if (!$bill) return response()->json(['message' => 'Bill not found'], 404);
        return response()->json($bill);
    }

    public function bulkUpdateCustomer(Request $request)
    {
        try {
            $validated = $request->validate([
                'sale_ids' => 'required|array',
                'sale_ids.*' => 'exists:sales,id',
                'customer_code' => 'required|string|max:255'
            ]);

            $updatedSales = [];
            foreach ($validated['sale_ids'] as $saleId) {
                $sale = Sale::find($saleId);
                $sale->customer_code = strtoupper($validated['customer_code']);
                $sale->save();
                $updatedSales[] = $sale;
            }

            return response()->json(['success' => true, 'sales' => $updatedSales]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function getTodaysKuliya(Request $request)
    {
        try {
            $kuliyaRecords = Sale::where('Kuliya', '>', 0)
                ->select('id', 'customer_name', 'customer_code', 'bill_no', 'Kuliya', 'created_at')
                ->orderBy('created_at', 'desc')->get();

            $totalKuliya = $kuliyaRecords->sum('Kuliya');
            return response()->json(['success' => true, 'data' => $kuliyaRecords, 'total' => $totalKuliya]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function getAllSales2()
    {
        try {
            $currentUser = auth()->user();
            if (!$currentUser) return response()->json(['error' => 'Unauthorized'], 401);

            $query = Sale::query();
            if ($currentUser->role === 'User') {
                $query->where('UniqueCode', $currentUser->user_id);
            }

            $allSales = $query->orderBy('created_at', 'desc')->get();
            return response()->json(['success' => true, 'sales' => $allSales]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }
}