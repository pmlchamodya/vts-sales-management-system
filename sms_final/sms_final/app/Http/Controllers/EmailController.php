<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class EmailController extends Controller
{
    public function sendReceiptEmail(Request $request)
    {
        // 1. Validate the incoming request
        $request->validate([
            'receipt_html'   => 'required',
            'customer_name'  => 'required',
            'emails'         => 'required|array', // Validate as a required array
        ]);

        $receiptHtml  = $request->input('receipt_html');
        $customerName = $request->input('customer_name');
        $emails       = $request->input('emails'); // Get the array of emails

        try {
            // 2. Try sending the email
            Mail::send('emails.receipt', [
                'htmlContent'  => $receiptHtml,
                'customerName' => $customerName,
            ], function ($message) use ($customerName, $emails) {
                // Loop through the emails array and add each as a recipient
                $message->to($emails)
                        ->subject("Invoice from TGK Traders - {$customerName}");
            });

            // Log success
            $emailList = implode(', ', $emails);
            Log::info("✅ Receipt email sent successfully to {$emailList} for customer {$customerName}.");

            return response()->json([
                'success' => true,
                'message' => 'Email sent successfully!',
            ]);

        } catch (\Exception $e) {
            // Log the full error if email fails
            $emailList = implode(', ', $emails);
            Log::error("❌ Failed to send receipt email to {$emailList}. Error: " . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to send email. Please check logs for details.',
            ], 500);
        }
    }
}