<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Settings
    |--------------------------------------------------------------------------
    */

    'show_warnings' => false,   // Throw an Exception on warnings from dompdf

    'public_path' => null,  // Override the public path if needed

    'convert_entities' => true,

    'options' => [

        'font_dir' => storage_path('fonts'), // where fonts are stored
        'font_cache' => storage_path('fonts'),
        'temp_dir' => sys_get_temp_dir(),
        'chroot' => realpath(base_path()),
        'allowed_protocols' => [
            'data://' => ['rules' => []],
            'file://' => ['rules' => []],
            'http://' => ['rules' => []],
            'https://' => ['rules' => []],
        ],
        'artifactPathValidation' => null,
        'log_output_file' => null,
        'enable_font_subsetting' => true, // enable font subsetting for Sinhala
        'pdf_backend' => 'CPDF',
        'default_media_type' => 'screen',
        'default_paper_size' => 'a4',
        'default_paper_orientation' => 'portrait',

        // Set default font to NotoSansSinhala
        'default_font' => 'NotoSansSinhala',

        'dpi' => 96,
        'enable_php' => false,
        'enable_javascript' => true,
        'enable_remote' => true, // enable for remote fonts/images if needed
        'allowed_remote_hosts' => null,
        'font_height_ratio' => 1.1,
        'enable_html5_parser' => true,

        // Register Sinhala font
        'font_family' => [
            'NotoSansSinhala' => [
                'R' => public_path('fonts/NotoSansSinhala-Regular.ttf'),
                'B' => public_path('fonts/NotoSansSinhala-Bold.ttf'), // optional
            ],
            'sans-serif' => [
                'R' => public_path('fonts/DejaVuSans.ttf'),
                'B' => public_path('fonts/DejaVuSans-Bold.ttf'),
            ],
        ],

    ],

];
