import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

/**
 * Koneksi Neon PostgreSQL (lazy, server-only).
 * DATABASE_URL diambil dari runtimeConfig — JANGAN import ini dari kode client.
 *
 * M2': schema Drizzle (hotels, estimations, leads, pricing, dst.) ditambahkan di sini
 * bersama drizzle-kit untuk migrations.
 */
let _client: ReturnType<typeof postgres> | null = null
let _db: ReturnType<typeof drizzle> | null = null

export function useDb() {
  const { databaseUrl } = useRuntimeConfig()
  if (!databaseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'DATABASE_URL belum dikonfigurasi (isi dari Neon project).',
    })
  }
  if (!_db) {
    _client = postgres(databaseUrl, { ssl: 'require', max: 5 })
    _db = drizzle(_client)
  }
  return _db
}
