# sht-admin

Backend + Admin Dashboard **Sudut Haramain Tour (SHT)** — Umroh Private, Sesuai Cara Anda.

"Simple for Customer, Powerful for Internal Team."

## Tech Stack

- **Laravel 13** (PHP 8.4)
- **PostgreSQL** via [Neon](https://neon.tech) (region Singapore)
- **Filament** admin panel (M1)
- REST API `/api/v1` → dikonsumsi `sht-web` (Nuxt 3)

## Setup

```bash
composer install
cp .env.example .env
# isi DATABASE_URL dari Neon project (postgresql://...@...neon.tech/sht?sslmode=require)
php artisan key:generate
php artisan migrate
php artisan serve
```

## Dokumen

- Development flow: [DEVFLOW.md](./DEVFLOW.md) (locked — mode interim pre-production)
- Blueprint backend & admin MVP: `PLAN-admin-phase.md` di workspace root
- Master context bisnis: SHT Master Project Context v0.3

## Aturan Keras

- `supplier_cost`, `markup_*`, internal notes **tidak boleh** keluar lewat API publik — gunakan whitelist di API Resource.
- Produk yang sudah dipakai estimasi: nonaktifkan/soft-delete, jangan hard delete.
- Validasi & kalkulasi pricing = wilayah backend (source of truth).
