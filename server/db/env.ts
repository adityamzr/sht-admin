import { config } from 'dotenv'

/**
 * BOOTSTRAP ENV untuk CLI standalone (M2.1).
 *
 * Nuxt/Nitro memuat .env otomatis, tetapi skrip standalone yang dijalankan
 * dengan `tsx` (db:seed, admin:create) dan `drizzle-kit` (db:migrate)
 * TIDAK memuat .env — sebelumnya mereka bergantung pada env yang di-export
 * shell secara manual. Import modul ini di titik masuk CLI untuk memuat
 * root `.env` secara otomatis.
 *
 * Variabel resmi database: NUXT_DATABASE_URL (dipakai runtime Nuxt,
 * CLI, dan environment Vercel). DATABASE_URL tetap diterima sebagai
 * fallback kompatibilitas (mis. copy-paste connection string Neon).
 */
config({ path: '.env' })

/** Ambil URL database; exit dengan pesan jelas bila benar-benar tidak ada. */
export function getDbUrl(): string {
  const url = process.env.NUXT_DATABASE_URL || process.env.DATABASE_URL || ''
  if (!url) {
    console.error(
      'NUXT_DATABASE_URL wajib diisi. Tambahkan ke file .env di root project (lihat .env.example) sebelum menjalankan perintah database.',
    )
    process.exit(1)
  }
  return url
}
