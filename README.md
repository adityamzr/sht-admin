# sht-admin

Backend API + Admin Dashboard **Sudut Haramain Tour (SHT)** — Umroh Private, Sesuai Cara Anda.

"Simple for Customer, Powerful for Internal Team."

## Branch Baseline

- **`dev`** = baseline pengembangan aktif (mode interim pre-production, lihat [DEVFLOW.md](./DEVFLOW.md)).
- **`main`** = production, protected — jangan push/merge langsung.

## Tech Stack (locked)

- **Nuxt 3 full-stack** (Vue 3 + Nitro) — satu bahasa TypeScript dengan `sht-web`
- **REST API** via Nitro server routes (`server/api/**`) — deployable ke **Vercel**
- **PostgreSQL** via [Neon](https://neon.tech) + **Drizzle ORM**
- **Tailwind CSS** — token warna selaras brand SHT

> Arsitektur sebelumnya (Laravel + Filament) dihapus pada M0 — **legacy / removed**.
> Riwayatnya tetap tersedia di git history.

## Setup

```bash
npm install
cp .env.example .env    # isi DATABASE_URL dari Neon (region Singapore)
npm run dev             # dev server, UI di /, health check di /api/health
npm run build           # validasi (wajib sebelum commit)
```

Catatan: `DATABASE_URL` baru dibutuhkan mulai milestone M3 (database).
`/api/health` dan dashboard tetap berjalan tanpa konfigurasi database.

## Struktur

```
server/api/        REST endpoints (Nitro)
server/utils/db.ts Neon client (server-only)
layouts/admin.vue  Shell sidebar admin
pages/[module].vue Placeholder modul (leads, hotels, pricing, ...)
```

## Roadmap

Roadmap master M0–M10 (lihat halaman Dashboard panel admin) adalah **satu-satunya
roadmap aktif**. Penomoran milestone lama admin (M0'–M7') sudah tidak berlaku.

## Aturan Keras

- `supplier_cost`, `markup_*`, internal notes **tidak boleh** keluar lewat API publik.
- Produk yang sudah dipakai estimasi: nonaktifkan/soft-delete, jangan hard delete.
- Validasi & kalkulasi pricing = wilayah backend (source of truth).
