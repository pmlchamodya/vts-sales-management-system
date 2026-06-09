<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

          <title>@yield('title', 'POS-Sales')</title>

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @vite(['resources/css/app.css'])

        <!-- Custom Background -->
        <style>
            body {
                background-color: #99ff99 !important;
                background-image: linear-gradient(135deg, #99ff99 0%, #ccffcc 100%);
            }
            .card {
                background: #ffffff;
                border-radius: 1rem;
                box-shadow: 0 8px 20px rgba(0,0,0,0.1);
                transition: transform 0.2s ease;
            }
            .card:hover {
                transform: translateY(-3px);
            }
            .logo {
                width: 120px;
                height: auto;
                margin: auto;
            }
        </style>
    </head>
    <body class="font-sans text-gray-900 antialiased">
        <div class="min-h-screen flex flex-col justify-center items-center px-4">
            
            <!-- Logo & Title -->
            <div class="text-center">
                <img src="{{ asset('assets/image.png') }}" alt="App Logo" class="logo mb-4">
                <h1 class="text-2xl font-bold text-gray-800">Welcome to POS-Sales</h1>
                <p class="text-gray-600 text-sm mt-1">Please sign in to continue</p>
            </div>

            <!-- Main Card -->
            <div class="w-full sm:max-w-md mt-6 px-6 py-8 card">
                {{ $slot }}
            </div>

            <!-- Footer -->
          
        </div>
        @stack('scripts')
    </body>
</html>
