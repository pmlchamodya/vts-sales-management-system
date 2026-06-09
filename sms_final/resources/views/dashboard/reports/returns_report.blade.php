@extends('layouts.app')

@section('content')
<style>
    body {
        background-color: #ccffcc !important; /* light green */
    }
</style>

<div class="container my-4">
    <div class="card border-success shadow-sm">
        <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Returns Report</h5>
          
        </div>
        <div class="card-body">
            @if($data->isEmpty())
                <p class="text-muted">No return records found.</p>
            @else
                <div class="table-responsive">
                    <table class="table table-bordered table-sm align-middle">
                        <thead class="table-success">
                            <tr>
                                <th>GRN Code</th>
                                <th>Item Code</th>
                                <th>Bill No</th>
                                <th>Weight</th>
                                <th>Packs</th>
                                <th>Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach($data as $row)
                                <tr>
                                    <td>{{ $row->GRN_Code }}</td>
                                    <td>{{ $row->Item_Code }}</td>
                                    <td>{{ $row->bill_no }}</td>
                                    <td>{{ $row->weight }}</td>
                                    <td>{{ $row->packs }}</td>
                                    <td>{{ $row->Reason }}</td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            @endif
        </div>
    </div>
</div>
@endsection
