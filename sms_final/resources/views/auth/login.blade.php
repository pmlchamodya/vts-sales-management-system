<x-guest-layout>
    <!-- Set page title -->
    <x-slot name="title">
        POS-Sales
    </x-slot>

    <!-- Session Status -->
    <x-auth-session-status class="mb-4" :status="session('status')" />

    <form method="POST" action="{{ route('login') }}">
        @csrf

       <!-- User ID -->
<div class="mt-4">
    <x-input-label for="user_id" :value="__('User ID')" />
    <x-text-input id="user_id" class="block mt-1 w-full" type="text" name="user_id"
        :value="old('user_id')" required autofocus autocomplete="username" />
    <x-input-error :messages="$errors->get('user_id')" class="mt-2" />

    <!-- Show fetched IP here -->
    <small id="user_ip_display" class="text-sm text-gray-500 mt-1 block"></small>
</div>

@push('scripts')
<script>
document.addEventListener("DOMContentLoaded", function () {
    const userIdInput = document.getElementById("user_id");
    const ipDisplay = document.getElementById("user_ip_display");
    let debounceTimer;

    userIdInput.addEventListener("input", function () {
        clearTimeout(debounceTimer); // reset timer
        const userId = this.value.trim();

        if (userId !== "") {
            debounceTimer = setTimeout(() => {
                fetch(`{{ url('get-user-ip') }}/${userId}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.ip_address) {
                            ipDisplay.textContent = "Registered IP: " + data.ip_address;
                            ipDisplay.classList.remove("text-red-500");
                            ipDisplay.classList.add("text-green-600");
                        } else {
                            ipDisplay.textContent = "No IP found for this User ID";
                            ipDisplay.classList.remove("text-green-600");
                            ipDisplay.classList.add("text-red-500");
                        }
                    })
                    .catch(() => {
                        ipDisplay.textContent = "Error fetching IP.";
                        ipDisplay.classList.add("text-red-500");
                    });
            }, 400); // delay 400ms after typing stops
        } else {
            ipDisplay.textContent = "";
        }
    });
});
</script>
@endpush


        <!-- Password -->
        <div class="mt-4">
            <x-input-label for="password" :value="__('Password')" />
            <x-text-input id="password" class="block mt-1 w-full" type="password" name="password" required
                autocomplete="current-password" />
            <x-input-error :messages="$errors->get('password')" class="mt-2" />
        </div>

        <!-- Remember Me -->
        <div class="block mt-4">
            <label for="remember_me" class="inline-flex items-center">
                <input id="remember_me" type="checkbox"
                    class="rounded dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-indigo-600 shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:focus:ring-offset-gray-800"
                    name="remember">
                <span class="ms-2 text-sm text-gray-600 dark:text-gray-400">{{ __('Remember me') }}</span>
            </label>
        </div>

        <!-- Login Button & Forgot Password -->
        <div class="flex items-center justify-end mt-4">
            @if (Route::has('password.request'))
                <a class="underline text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                    href="{{ route('password.request') }}">
                    {{ __('Forgot your password?') }}
                </a>
            @endif

            <x-primary-button class="ms-3">
                {{ __('Log in') }}
            </x-primary-button>
        </div>
    </form>
</x-guest-layout>
