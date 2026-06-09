<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Sale;
use Illuminate\Support\Carbon;
use App\Models\SalesHistory;
use App\Models\BillNumber;
use Illuminate\Support\Facades\DB;
class BillController extends Controller
{
public function finalizeAndPrint(Request $request)
{
    $saleIds = $request->input('sale_ids');
    $transportCost = $request->input('transport_cost', 0.00);
    $laborCost = $request->input('labor_cost', 0.00);

    // 1. Generate Automatic 4-Digit Bill Number starting from 1000
    $lastBillInSales = Sale::whereNotNull('bill_no')->orderBy('bill_no', 'desc')->first();
    $lastBillInHistory = SalesHistory::whereNotNull('bill_no')->orderBy('bill_no', 'desc')->first();

    $lastBillNumber = 0;

    if ($lastBillInSales && $lastBillInHistory) {
        $lastBillNumber = max((int)$lastBillInSales->bill_no, (int)$lastBillInHistory->bill_no);
    } elseif ($lastBillInSales) {
        $lastBillNumber = (int)$lastBillInSales->bill_no;
    } elseif ($lastBillInHistory) {
        $lastBillNumber = (int)$lastBillInHistory->bill_no;
    } else {
        $lastBillNumber = 999; // start from 1000 if no data
    }

    $newBillNumber = str_pad($lastBillNumber + 1, 4, '0', STR_PAD_LEFT);

    // 2. Fetch sales to finalize
    $salesToUpdate = Sale::whereIn('id', $saleIds)->get();

    if ($salesToUpdate->isEmpty()) {
        return response()->json(['error' => 'No sales found to finalize and print.'], 404);
    }

    // 3. Update sales with bill_no, printed, and processed flags
    Sale::whereIn('id', $saleIds)->update([
        'bill_no' => $newBillNumber,
        'bill_printed' => 'Y',
        'Processed' => 'Y',
        'updated_at' => Carbon::now()
    ]);

    // 4. Move sales to SalesHistory
    foreach ($salesToUpdate as $sale) {
        SalesHistory::create([
            'customer_name' => $sale->customer_name,
            'customer_code' => $sale->customer_code,
            'supplier_code' => $sale->supplier_code,
            'code' => $sale->code,
            'item_code' => $sale->item_code,
            'item_name' => $sale->item_name,
            'weight' => $sale->weight,
            'price_per_kg' => $sale->price_per_kg,
            'total' => $sale->total,
            'packs' => $sale->packs,
            'bill_printed' => 'Y',
            'Processed' => 'Y',
            'bill_no' => $newBillNumber,
            'updated' => Carbon::now(),
            'is_printed' => 'Y',
            'CustomerBillEnteredOn' => $sale->created_at,
            'FirstTimeBillPrintedOn' => Carbon::now(),
            'BillChangedOn' => null,
            'UniqueCode' => $sale->id
        ]);
    }

    // 5. Delete original sales
    Sale::whereIn('id', $saleIds)->delete();

    // 6. Prepare data for print template
    $totalBillValue = $salesToUpdate->sum('total');

    $billDataForTemplate = (object) [
        'bill_number' => $newBillNumber,
        'date' => Carbon::now(),
        'transport_cost' => $transportCost,
        'labor_cost' => $laborCost,
        'total_value' => $totalBillValue,
        'items' => $salesToUpdate->map(function($sale) {
            return (object) [
                'item_name' => $sale->item_name,
                'kilograms' => $sale->weight,
                'rate' => $sale->price_per_kg,
                'value' => $sale->total,
                'additional_note' => "(" . $sale->item_name . " " . number_format($sale->weight, 0) . "/" . number_format($sale->packs, 0) . ")"
            ];
        })
    ];

    // 7. Render print template
    $html = view('dashboard.bills.print_template', ['bill' => $billDataForTemplate])->render();

    return response()->json([
        'html' => $html,
        'bill_number' => $newBillNumber,
        'message' => 'Bill finalized and sales moved to history.'
    ]);
}

  
}