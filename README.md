# sht-admin

Backend API + Admin Dashboard **Sudut Haramain Tour (SHT)** — Umroh Private, Sesuai Cara Anda.

"Simple for Customer, Powerful for Internal Team."

## Branch Baseline

- **`dev`** = baseline pengembangan aktif (mode interim pre-production, lihat [DEVFLOW.md](./DEVFLOW.md)).
- **`main`** = production, protected — jangan push/merge langsung.

## Tech Stack (locked)

- **Nuxt 3 full-stack** (Vue 3 + Nitro) — REST API via Nitro server routes, deployable ke **Vercel**
- **PostgreSQL** via [Neon](https://neon.tech) + **Drizzle ORM** (migrations + seed committed)
- **Zod** untuk validasi server-side semua write
- **Tailwind CSS** — token warna selaras brand SHT

> Arsitektur sebelumnya (Laravel + Filament) dihapus pada M0 — **legacy / removed**.
> Riwayatnya tetap tersedia di git history.

## Setup

```bash
npm install
cp .env.example .env          # isi DATABASE_URL (dan NUXT_SESSION_SECRET untuk runtime)
npm run db:migrate            # terapkan migrasi Drizzle (DATABASE_URL)
npm run db:seed               # isi data development (idempotent)
npm run dev                   # UI admin di /, health di /api/health
```

- **Runtime app** membaca `NUXT_DATABASE_URL` (konvensi Nitro) dan `NUXT_SESSION_SECRET`.
- **CLI tools** (`db:migrate`, `db:seed`, `admin:create`) membaca `DATABASE_URL`.
- Di Vercel: set `NUXT_DATABASE_URL` + `NUXT_SESSION_SECRET` via Environment Variables.

## Scripts

| Perintah | Fungsi |
|---|---|
| `npm run db:generate` | Generate migrasi dari schema (`drizzle-kit generate`) |
| `npm run db:migrate` | Terapkan migrasi ke database |
| `npm run db:seed` | Seed data development (idempotent; admin dev: `admin@sudutharamain.id`) |
| `npm run admin:create` | Buat admin production (env: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`) |
| `npm test` | Test kritis backend (pricing, periode, kurs, serializer, validasi, auth hash, EST-ID) |
| `npm run build` | Build + typecheck (vue-tsc) — wajib sebelum commit |

## Struktur (M2)

```
server/db/              schema.ts, migrasi (committed), seed.ts, create-admin.ts
server/services/        auth, catalog, pricing (primitives), estimation, leads
server/utils/           validators (zod), serializers (public/admin), session (HMAC cookie)
server/api/admin/       API admin — dilindungi session (middleware guard global)
server/api/v1/          API publik untuk sht-web (read-only, serializer eksplisit)
pages/                  UI admin: dashboard, leads, estimations, hotels, flights,
                        transport, services, pricing, pricing-periods, exchange-rates,
                        departure-cities, settings, login
```

## Domain (ringkasan)

- **Katalog:** departure cities, hotels + room types, flights (CGK→JED), transport vehicles/routes/route×vehicle, services (visa dimodelkan sebagai service).
- **Pricing:** satu tabel `pricing_records` (entity × period × currency × strategy). Strategi: `manual`, `cost_plus_fixed`, `cost_plus_percentage`. Periode harga: prioritas numerik unik — **prioritas tertinggi menang** saat overlap.
- **Kurs:** admin-managed, satu kurs aktif per pasangan (USD/SAR → IDR); di-snapshot ke estimasi. **Fail-closed (M2.1):** harga non-IDR tanpa kurs aktif TIDAK PERNAH jatuh ke 1:1 — IDR price = `null` di API publik; submit estimasi (M3) wajib gagal bila komponen tidak bisa di-resolve ke IDR.
- **Estimasi:** snapshot immutabel (config trip + item + kurs) — nomor `EST-000123` dari DB sequence. Read-only di admin (M2).
- **Lead:** `estimation` (terhubung estimasi) & `service_inquiry` (tanpa estimasi); lifecycle `NEW → CONTACTED → FOLLOW_UP → WON / LOST`.
- **Auth:** session cookie HTTP-only (HMAC-sealed, `NUXT_SESSION_SECRET`), password scrypt, guard global `/api/admin/*`.

## Aturan Keras

- `supplier_cost`, `markup_*`, internal notes **tidak boleh** keluar lewat API publik (`/api/v1` memakai serializer field-by-field).
- Produk yang sudah dipakai estimasi: nonaktifkan/arsipkan (soft-delete), jangan hard delete.
- Validasi & kalkulasi pricing = wilayah backend (source of truth).
- Estimasi BUKAN harga final — konfirmasi tim SHT.

## Catatan M2 (review M3)

- Driver DB: `postgres-js` (lazy, `prepare: false`, ssl auto utk Neon) — cukup aman untuk Vercel/Neon; evaluasi ulang di M3 hanya bila perlu.
- Submit flow customer (validasi → kalkulasi ulang → snapshot → lead → EST-ID → WhatsApp) **belum** diimplementasikan — itu M3+.
