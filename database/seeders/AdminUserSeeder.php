<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Membuat akun admin awal (idempotent).
 * Password diambil dari env ADMIN_DEFAULT_PASSWORD — WAJIB diganti di production.
 */
class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@sudutharamain.id'],
            [
                'name' => 'Admin SHT',
                'password' => Hash::make(env('ADMIN_DEFAULT_PASSWORD', 'password')),
            ],
        );
    }
}
