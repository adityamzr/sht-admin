import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

/**
 * Koneksi PostgreSQL (Neon di production, localhost untuk development).
 * - Lazy: koneksi dibuka saat query pertama (aman untuk serverless/Vercel).
 * - ssl: otomatis 'require' untuk Neon, off untuk localhost.
 * - prepare: false — menghindari masalah prepared statement di pooled
 *   connection (Neon/pgbouncer). Catatan: postgres-js dipakai sampai ada
 *   alasan kuat pindah driver (review ulang di M3 bila perlu).
 */
let _client: ReturnType<typeof postgres> | null = null
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function useDb() {
  const { databaseUrl } = useRuntimeConfig()
  if (!databaseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'NUXT_DATABASE_URL belum dikonfigurasi. Tambahkan ke file .env (lihat .env.example) atau environment Vercel.',
    })
  }
  if (!_db) {
    const ssl = /neon\.tech|sslmode=require/.test(databaseUrl) ? ('require' as const) : false
    _client = postgres(databaseUrl, { ssl, max: 5, prepare: false })
    _db = drizzle(_client, { schema })
  }
  return _db
}

export type Db = ReturnType<typeof useDb>

/** Bisa database biasa atau transaksi (PgTransaction) — dipakai service layer. */
export type DbLike = Db | Parameters<Parameters<Db['transaction']>[0]>[0]
