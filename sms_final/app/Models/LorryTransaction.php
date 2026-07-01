<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LorryTransaction extends Model
{
    use HasFactory;

    protected $table = 'lorry_transactions';

    protected $fillable = [
        'lorry_name',
        'customer_code',
        'total_amount',
        'box_type',
        'lorry_amount',
        'nattami',
    ];
}
