# sht-admin

Backend API + Admin Dashboard **Sudut Haramain Tour (SHT)** — Umroh Private, Sesuai Cara Anda.

"Simple for Customer, Powerful for Internal Team."

## Tech Stack (locked revisi — menggantikan Laravel)

- **Nuxt 3 full-stack** (Vue 3 + Nitro) — satu bahasa TypeScript dengan `sht-web`
- **REST API** via Nitro server routes (`server/api/**`) — deployable ke **Vercel**
- **PostgreSQL** via [Neon](https://neon.tech) + **Drizzle ORM**
- **Tailwind CSS** — token warna selaras brand SHT

## Setup

```bash
npm install
cp .env.example .env    # isi DATABASE_URL dari Neon (region Singapore)
npm run dev             # dev server, UI di /, health check di /api/health
npm run build           # validasi (wajib sebelum commit)
```

## Struktur

```
server/api/        REST endpoints (Nitro)
server/utils/db.ts Neon client (server-only)
layouts/admin.vue  Shell sidebar admin
pages/[module].vue Placeholder modul (leads, hotels, pricing, ...)
```

## Dokumen

- Development flow: [DEVFLOW.md](./DEVFLOW.md) (locked — mode interim pre-production)
- Blueprint: `PLAN-admin-phase.md` di workspace root (revisi stack Node/Vue)

## Aturan Keras

- `supplier_cost`, `markup_*`, internal notes **tidak boleh** keluar lewat API publik.
- Produk yang sudah dipakai estimasi: nonaktifkan/soft-delete, jangan hard delete.
- Validasi & kalkulasi pricing = wilayah backend (source of truth).
