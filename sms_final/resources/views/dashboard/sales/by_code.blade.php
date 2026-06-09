@extends('layouts.app')

@section('content')
    <style>
        /* Full page background */
        body {
            background-color: #99ff99 !important;
        }

        /* Card background */
        .card {
            background-color: #006400 !important;
            color: white; /* Make text inside card white for better contrast */
        }

        /* Optional: make table text readable */
        .table {
            background-color: white;
            color: black;
        }

        /* Summary line styling */
        .summary-line-display {
            background-color: #f8f9fa;
            border: 2px solid #dee2e6;
            border-radius: 0.75rem;
            padding: 1rem;
        }
        .summary-line-display h5 {
            margin-bottom: 0.75rem;
            color: #212529;
        }
        .summary-line-display p {
            margin: 0.25rem 0;
            font-size: 0.95rem;
            color: #212529;
        }
    </style>

    <div class="container mt-3">

       
        {{-- ✅ Sales Table --}}
        <div class="card shadow-sm border-0 rounded-3 p-3 mt-3">
          
             {{-- ✅ Summary Line --}}
      <div class="bg-light border rounded-3 p-3 my-4 summary-line-display d-flex flex-wrap align-items-center justify-content-between text-dark">
    <span class="me-3"><strong>GRN:</strong> {{ $code ?? 'N/A' }}</span>
    <span class="me-3"><strong>අයිතම කේතය:</strong> {{ $itemCode ?? 'N/A' }}</span>
    <span class="me-3"><strong>බර:</strong> {{ $weight_ratio_display }}</span>
    <span class="me-3"><strong>මලු:</strong> {{ $packs_ratio_display }}</span>
</div>



            <table class="table table-sm table-bordered">
                <thead class="table-light">
                    <tr>
                        <th>දිනය</th>
                        <th>ගනුදෙනුකරු</th>
                      
                        <th>අයිතම</th>
                        <th>බර</th>
                        <th>කිලෝමිල</th>
                        <th>මුළු මුදල</th>
                        <th>පැක්</th>
                        <th>බිල්පත් අංකය</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($sales as $sale)
                        <tr>
                           <td>{{ $sale->created_at->format('Y-m-d') }}</td>
                            <td>{{ $sale->customer_code }}</td>
                           
                            <td>{{ $sale->item_name }}</td>
                            <td>{{ $sale->weight }}</td>
                            <td>{{ number_format($sale->price_per_kg, 2) }}</td>
                            <td>{{ number_format($sale->total, 2) }}</td>
                            <td>{{ $sale->packs }}</td>
                            <td>{{ $sale->bill_no }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    </div>
@endsection
