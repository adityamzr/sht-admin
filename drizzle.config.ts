// Muat root .env untuk drizzle-kit (CLI standalone tidak memuat .env otomatis).
import './server/db/env'
import { defineConfig } from 'drizzle-kit'

const dbUrl = process.env.NUXT_DATABASE_URL || process.env.DATABASE_URL || ''
if (!dbUrl) {
  throw new Error(
    'NUXT_DATABASE_URL wajib diisi. Tambahkan ke file .env di root project (lihat .env.example) sebelum menjalankan drizzle-kit.',
  )
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  strict: true,
  dbCredentials: {
    url: dbUrl,
  },
})
