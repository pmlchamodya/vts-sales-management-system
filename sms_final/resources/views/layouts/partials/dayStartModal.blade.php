<!-- Modal -->
<div class="modal fade" id="dayStartModal" tabindex="-1" aria-labelledby="dayStartModalLabel" aria-hidden="true">
    <div class="modal-dialog">
        <form action="{{ route('sales.dayStart') }}" method="POST">
            @csrf
            <div class="modal-content">
                <div class="modal-header" style="background-color: #4CAF50; color: white;">
                    <h5 class="modal-title" id="dayStartModalLabel">Confirm Day Start</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"
                        aria-label="Close"></button>
                </div>
                <div class="modal-body" style="padding: 20px; background-color: #f9f9f9;">
                    <p style="font-size: 16px;">Are you sure you want to start a new day?</p>
                    <p style="font-size: 15px; color: #555;">All current sales will be <b>archived</b> and removed.</p>

                    <!-- Password field -->
                    <div class="form-group mb-3">
                        <label for="confirm_password" class="form-label">Enter Password:</label>
                        <input type="password" class="form-control" id="confirm_password"
                            placeholder="Enter password to unlock">
                    </div>

                    <!-- Date field (initially disabled) -->
                    <div class="form-group mb-3">
                        <label for="new_day_date" class="form-label">Select Date:</label>
                        <input type="date" class="form-control" id="new_day_date" name="new_day_date"
                            value="{{ \Carbon\Carbon::now()->format('Y-m-d') }}" disabled>
                    </div>

                   
                </div>
                    <div class="modal-footer" style="background-color: #f1f1f1; display: flex; gap: 10px; justify-content: flex-end; flex-wrap: nowrap;">
    <button type="button" class="btn btn-secondary">Cancel</button>

    <button type="submit" class="btn" style="background-color: #4CAF50; color: white;">
        ✅ Yes Start 
    </button>

    <a href="{{ route('generate.report') }}" 
       class="btn btn-primary"
       onclick="return confirm('Are you sure you want to generate the report and send emails?');">
       Generate Report
    </a>
</div>
            </div>
        </form>
    </div>
</div>

<!-- Script -->
<script>
    document.addEventListener("DOMContentLoaded", function () {
        const passwordField = document.getElementById("confirm_password");
        const dateField = document.getElementById("new_day_date");
        const balanceField = document.getElementById("end_day_balance");

        passwordField.addEventListener("input", function () {
            if (passwordField.value === "123") {
                dateField.removeAttribute("disabled"); // Enable date field
                balanceField.removeAttribute("disabled"); // Enable balance field
            } else {
                dateField.setAttribute("disabled", true); // Disable date field
                balanceField.setAttribute("disabled", true); // Disable balance field
            }
        });
    });
</script>

