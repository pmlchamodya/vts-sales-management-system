<?php

namespace App\Models; // <-- ADDED: Correct namespace for Laravel models

use Illuminate\Database\Eloquent\Model; // <-- ADDED: Import the base Model class

class GrnEntry2 extends Model
{
    // If your table name is not 'grn_entries', specify it here:
    // protected $table = 'your_grn_entries_table_name';
    // By convention, Laravel will assume your table name is 'grn_entries' (plural of GrnEntry)

    protected $fillable = [
        
        'code',
        'supplier_code',
        'item_code',
        'item_name',
        'packs',
        'weight',
        'txn_date',
        'grn_no',
        'per_kg_price',
        'type',
    ];

    // Optional: If you don't want timestamps (created_at, updated_at)
    // public $timestamps = false;
}