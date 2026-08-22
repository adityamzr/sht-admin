import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { eq } from 'drizzle-orm'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import '../server/db/env'
import * as schema from '../server/db/schema'
import type { DbLike } from '../server/db'
import { createRoomType, getHotel, listRoomTypes, softDeleteRoomType } from '../server/services/catalog'
import { roomTypeCreateInput, roomTypePatch } from '../server/utils/validators'

/**
 * REGRESI M3.2 — POST /api/admin/hotels/:id/room-types:
 * hotelId dari route param (bukan body). Mensimulasikan alur route handler
 * dengan servis yang sama persis seperti handler produksi.
 */

const DATABASE_URL = process.env.NUXT_DATABASE_URL || process.env.DATABASE_URL || ''
const HAS_DB = Boolean(DATABASE_URL)

let db: DbLike

before(async () => {
  if (!HAS_DB) return
  const client = postgres(DATABASE_URL, { max: 5, prepare: false, ssl: /neon\.tech|sslmode=require/.test(DATABASE_URL) ? 'require' : false })
  db = drizzle(client, { schema })
})

after(() => {
  if (db && typeof (db as unknown as { $client?: { end?: () => Promise<void> } }).$client?.end === 'function') {
    return (db as unknown as { $client: { end: () => Promise<void> } }).$client.end()
  }
})

async function inRollback<T>(fn: (tx: DbLike) => Promise<T>): Promise<T> {
  let out!: T
  try {
    await db.transaction(async (tx) => {
      out = await fn(tx)
      await tx.rollback()
    })
  } catch (err) {
    if (!/rollback/i.test(String((err as { message?: string })?.message ?? err))) throw err
  }
  return out
}

/** Replika logika route handler (hotelId dari route, body tanpa hotelId). */
async function routeCreateRoomType(tx: DbLike, hotelId: number, body: unknown) {
  const parsed = roomTypeCreateInput.safeParse(body)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'invalid' }
  const hotel = await getHotel(tx, hotelId)
  if (!hotel) return { error: 'not_found' }
  const row = await createRoomType(tx, { ...parsed.data, hotelId })
  return { row }
}

describe('room-type nested route (M3.2)', { skip: !HAS_DB ? 'DATABASE_URL tidak di-set' : false }, () => {
  it('1. body TANPA hotelId → sukses, kamar milik hotel dari :id', async () => {
    await inRollback(async (tx) => {
      const [hotel] = await tx.select().from(schema.hotels).where(eq(schema.hotels.name, 'Swissôtel Makkah')).limit(1)
      const res = await routeCreateRoomType(tx, hotel.id, { name: 'Suite', capacity: 4, isActive: true, sortOrder: 9 })
      assert.ok('row' in res, 'harus sukses tanpa hotelId di body')
      const row = (res as { row: { id: number; hotelId: number; name: string; capacity: number } }).row
      assert.equal(row.hotelId, hotel.id)
      assert.equal(row.capacity, 4)
      // kamar benar-benar masuk hotel yang dituju
      const rooms = await listRoomTypes(tx, hotel.id)
      assert.ok(rooms.some((r) => r.id === row.id && r.hotelId === hotel.id))
    })
  })

  it('2. hotel tidak ada di route :id → aman ditolak (404 path)', async () => {
    await inRollback(async (tx) => {
      const res = await routeCreateRoomType(tx, 999999, { name: 'Quad', capacity: 4, isActive: true, sortOrder: 0 })
      assert.equal((res as { error: string }).error, 'not_found')
    })
  })

  it('3. kapasitas invalid (0 / negatif / >12 / non-angka) → ditolak validator', async () => {
    for (const capacity of [0, -1, 13, 'x']) {
      const res = roomTypeCreateInput.safeParse({ name: 'Quad', capacity, isActive: true, sortOrder: 0 })
      assert.equal(res.success, false, `capacity=${capacity} harus ditolak`)
    }
  })

  it('4. field wajib hilang → ditolak (validasi tidak melemah)', async () => {
    assert.equal(roomTypeCreateInput.safeParse({ capacity: 4 }).success, false)
    assert.equal(roomTypeCreateInput.safeParse({ name: 'Quad', capacity: 4, isActive: 'yes' }).success, false)
  })

  it('5. perilaku lama roomTypePatch tetap jalan (partial tanpa hotelId)', async () => {
    const res = roomTypePatch.safeParse({ isActive: false, capacity: 3 })
    assert.equal(res.success, true)
    if (res.success) assert.equal('hotelId' in res.data, false)
  })

  it('6. soft-delete tipe kamar tetap berfungsi (existing behavior)', async () => {
    await inRollback(async (tx) => {
      const [hotel] = await tx.select().from(schema.hotels).where(eq(schema.hotels.name, 'Pullman ZamZam Makkah')).limit(1)
      const row = await createRoomType(tx, { name: 'Uji', capacity: 2, isActive: true, sortOrder: 0, hotelId: hotel.id })
      const deleted = await softDeleteRoomType(tx, row.id)
      assert.ok(deleted)
      const afterRows = await listRoomTypes(tx, hotel.id)
      assert.ok(!afterRows.some((r) => r.id === row.id), 'soft-delete harus menyembunyikan dari listing')
    })
  })
})
