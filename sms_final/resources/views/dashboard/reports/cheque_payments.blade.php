@extends('layouts.app')

@section('content')
<style>
    body, html { background-color:  #99ff99 !important; }
    .container { padding-top: 30px; }
    .table { background-color: #ffffff; }
    .table thead th { background-color: #99cc99; color: #000; }
</style>

<div class="container">
    <h2 class="mb-4">Cheque Payments Report</h2>

    {{-- Date Range Filter Form --}}
    <form method="GET" action="{{ route('reports.cheque-payments') }}" class="row g-3 mb-3">
        <div class="col-auto">
            <input type="date" name="start_date" class="form-control" placeholder="Start Date" 
                value="{{ $start_date ?? '' }}">
        </div>
        <div class="col-auto">
            <input type="date" name="end_date" class="form-control" placeholder="End Date" 
                value="{{ $end_date ?? '' }}">
        </div>
        <div class="col-auto">
            <button type="submit" class="btn btn-dark">Filter</button>
        </div>
    </form>

   <table class="table table-bordered table-striped">
    <thead>
        <tr>
            <th>පාරිභෝගිකයා</th>
            <th>විස්තරය</th>
            <th>මුදල</th>
            <th>චෙක් අංකය</th>
           <th>බැංකුව</th>          
           <th>චෙක් දිනය</th>
           <th>Status</th>
        </tr>
    </thead>
    <tbody>
        @forelse($chequePayments as $payment)
            <tr>
                <td>{{ $payment->customer_short_name }}</td>
                <td>{{ $payment->description }}</td>
                <td style="text-align:right;">{{ number_format($payment->amount, 2) }}</td>
                <td>{{ $payment->cheque_no }}</td>
                <td>{{ $payment->bank }}</td>
                <td>{{ \Carbon\Carbon::parse($payment->cheque_date)->format('Y-m-d') }}</td>
                <td>
                    <select class="form-select status-dropdown" data-id="{{ $payment->id }}">
                        <option value="Non realized" {{ $payment->status == 'Non realized' ? 'selected' : '' }}>Non realized</option>
                        <option value="Realized" {{ $payment->status == 'Realized' ? 'selected' : '' }}>Realized</option>
                        <option value="Return" {{ $payment->status == 'Return' ? 'selected' : '' }}>Return</option>
                    </select>
                </td>
            </tr>
        @empty
            <tr>
                <td colspan="7" class="text-center">No cheque payments found.</td>
            </tr>
        @endforelse
    </tbody>
</table>

</div>
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script>
$(document).on('change', '.status-dropdown', function () {
    let id = $(this).data('id');
    let status = $(this).val();

    $.ajax({
        url:"https://wday.lk/AA/sms/reports/update-status/" + id,   // fixed 
        type: "POST",
        data: {
            _token: "{{ csrf_token() }}",
            status: status
        },
        success: function (response) {
            if (response.success) {
                alert('Status updated to ' + response.status);
            }
        },
        error: function () {
            alert('Error updating status.');
        }
    });
});
</script>


@endsection
