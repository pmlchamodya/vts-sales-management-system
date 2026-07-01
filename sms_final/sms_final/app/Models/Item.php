<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Item extends Model
{
    protected $fillable = [
    'no', 'type', 'Shortkey', 'pack_cost', 'pack_due', 'bag_real_price'
];
}