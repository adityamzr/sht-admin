import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { and, eq } from 'drizzle-orm'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import '../server/db/env' // muat root .env (konsisten dengan CLI M2.1)
import * as schema from '../server/db/schema'
import type { DbLike } from '../server/db'
import { calculateTrip, TripPricingError, TripValidationError, type TripInput } from '../server/services/estimationEngine'
import { createEstimation } from '../server/services/estimation'
import { createLead } from '../server/services/leads'

/**
 * TES ENGINE M3 (DB-backed).
 * Kebutuhan: database ter-seed (`npm run db:migrate && npm run db:seed`).
 * Semua test berjalan dalam transaksi yang di-rollback → DB tidak tercemar.
 */

const DATABASE_URL = process.env.NUXT_DATABASE_URL || process.env.DATABASE_URL || ''
const HAS_DB = Boolean(DATABASE_URL)

let db: DbLike
let seeded = false

async function ensureSeeded() {
  if (seeded) return
  const rows = await db.select().from(schema.pricingPeriods)
  if (rows.length < 3) throw new Error('Database belum di-seed — jalankan: npm run db:seed')
  seeded = true
}

/** Jalankan fn dalam transaksi yang di-rollback (no pollution). */
async function inRollback<T>(fn: (tx: DbLike) => Promise<T>): Promise<T> {
  let out!: T
  try {
    await db.transaction(async (tx) => {
      out = await fn(tx)
      // Lempar sinyal rollback → transaksi ABORT (tidak commit).
      await tx.rollback()
    })
  } catch (err) {
    // Sinyal rollback memang melempar — pastikan itu errornya, bukan error lain.
    const msg = String((err as { message?: string })?.message ?? err)
    if (!/rollback/i.test(msg)) throw err
  }
  return out
}

// ─── Lookup helper dari data seed (dinamis, tidak hard-code ID) ─────────────
async function hotelId(tx: DbLike, name: string): Promise<number> {
  const r = await tx.select().from(schema.hotels).where(eq(schema.hotels.name, name)).limit(1)
  if (!r[0]) throw new Error(`Seed missing hotel: ${name}`)
  return r[0].id
}
async function roomId(tx: DbLike, hotelId: number, name: string): Promise<number> {
  const r = await tx
    .select()
    .from(schema.hotelRoomTypes)
    .where(and(eq(schema.hotelRoomTypes.hotelId, hotelId), eq(schema.hotelRoomTypes.name, name)))
    .limit(1)
  if (!r[0]) throw new Error(`Seed missing room: ${name}`)
  return r[0].id
}
async function flightId(tx: DbLike, airline: string): Promise<number> {
  const r = await tx.select().from(schema.flights).where(eq(schema.flights.airline, airline)).limit(1)
  if (!r[0]) throw new Error(`Seed missing flight: ${airline}`)
  return r[0].id
}
async function vehicleId(tx: DbLike, name: string): Promise<number> {
  const r = await tx.select().from(schema.transportVehicles).where(eq(schema.transportVehicles.name, name)).limit(1)
  if (!r[0]) throw new Error(`Seed missing vehicle: ${name}`)
  return r[0].id
}
async function routeId(tx: DbLike, name: string): Promise<number> {
  const r = await tx.select().from(schema.transportRoutes).where(eq(schema.transportRoutes.name, name)).limit(1)
  if (!r[0]) throw new Error(`Seed missing route: ${name}`)
  return r[0].id
}
async function serviceId(tx: DbLike, code: string): Promise<number> {
  const r = await tx.select().from(schema.services).where(eq(schema.services.code, code)).limit(1)
  if (!r[0]) throw new Error(`Seed missing service: ${code}`)
  return r[0].id
}
async function periodId(tx: DbLike, name: string): Promise<number> {
  const r = await tx.select().from(schema.pricingPeriods).where(eq(schema.pricingPeriods.name, name)).limit(1)
  if (!r[0]) throw new Error(`Seed missing period: ${name}`)
  return r[0].id
}


async function createFreshHotelRoom(tx: DbLike, city: 'Makkah' | 'Madinah', roomName = 'Quad') {
  const [hotel] = await tx
    .insert(schema.hotels)
    .values({ name: `Test Hotel ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, city, starRating: 4, distanceLabel: 'test', description: '', coverImage: '', gallery: [], isActive: true, sortOrder: 0 })
    .returning()
  const [room] = await tx
    .insert(schema.hotelRoomTypes)
    .values({ hotelId: hotel.id, name: roomName, capacity: 4, isActive: true, sortOrder: 0 })
    .returning()
  return { hotel, room }
}

async function baseTrip(tx: DbLike, overrides: Partial<TripInput> = {}): Promise<TripInput> {
  const makkahHotel = await hotelId(tx, 'Swissôtel Makkah')
  const madinahHotel = await hotelId(tx, 'Sofitel Shahd Al Madinah')
  return {
    pilgrims: 4,
    departureCity: 'jakarta',
    departureDate: '2026-10-12',
    durationDays: 12,
    makkahNights: 6,
    madinahNights: 5,
    flightId: await flightId(tx, 'Garuda Indonesia'),
    makkahHotelId: makkahHotel,
    makkahRooms: [{ roomTypeId: await roomId(tx, makkahHotel, 'Quad'), quantity: 1 }],
    madinahHotelId: madinahHotel,
    madinahRooms: [{ roomTypeId: await roomId(tx, madinahHotel, 'Quad'), quantity: 1 }],
    transport: [],
    visa: 'needed',
    services: [],
    ...overrides,
  }
}

before(async () => {
  if (!HAS_DB) return
  const client = postgres(DATABASE_URL, { max: 5, prepare: false, ssl: /neon\.tech|sslmode=require/.test(DATABASE_URL) ? 'require' : false })
  db = drizzle(client, { schema })
  await ensureSeeded()
})

after(() => {
  // Tutup koneksi agar proses node:test selesai (tidak menggantung).
  if (db && typeof (db as unknown as { $client?: { end?: () => Promise<void> } }).$client?.end === 'function') {
    return (db as unknown as { $client: { end: () => Promise<void> } }).$client.end()
  }
})

describe('estimation engine (M3)', { skip: !HAS_DB ? 'DATABASE_URL tidak di-set' : false }, () => {
  it('1. trip standar valid → total = jumlah seluruh item', async () => {
    await inRollback(async (tx) => {
      const trip = await baseTrip(tx, { visa: 'needed', services: [] })
      const calc = await calculateTrip(tx, trip)
      assert.equal(calc.total, calc.items.reduce((s, i) => s + i.amount, 0))
      assert.ok(calc.total > 0)
      const cats = new Set(calc.items.map((i) => i.category))
      for (const c of ['flight', 'hotel_makkah', 'hotel_madinah', 'visa']) assert.ok(cats.has(c), `kategori ${c} harus ada`)
    })
  })

  it('2. keberangkatan Bandung → fee 650.000 × pax', async () => {
    await inRollback(async (tx) => {
      const trip = await baseTrip(tx, { departureCity: 'bandung' })
      const calc = await calculateTrip(tx, trip)
      const dep = calc.items.find((i) => i.category === 'departure')
      assert.ok(dep, 'kategori departure harus ada')
      assert.equal(dep.amount, 650000 * 4)
    })
  })

  it('3. kamar campuran (Quad+Double utk 6 jamaah) valid', async () => {
    await inRollback(async (tx) => {
      const makkahHotel = await hotelId(tx, 'Swissôtel Makkah')
      const madinahHotel = await hotelId(tx, 'Sofitel Shahd Al Madinah')
      const trip = await baseTrip(tx, {
        pilgrims: 6,
        makkahRooms: [
          { roomTypeId: await roomId(tx, makkahHotel, 'Quad'), quantity: 1 },
          { roomTypeId: await roomId(tx, makkahHotel, 'Double'), quantity: 1 },
        ],
        madinahRooms: [
          { roomTypeId: await roomId(tx, madinahHotel, 'Quad'), quantity: 1 },
          { roomTypeId: await roomId(tx, madinahHotel, 'Double'), quantity: 1 },
        ],
      })
      const calc = await calculateTrip(tx, trip)
      const hotelLines = calc.items.filter((i) => i.category === 'hotel_makkah')
      assert.equal(hotelLines.length, 2)
    })
  })

  it('4. kapasitas kamar kurang → ditolak (422)', async () => {
    await inRollback(async (tx) => {
      const trip = await baseTrip(tx, { pilgrims: 6 }) // hanya 1 Quad (kap 4)
      await assert.rejects(() => calculateTrip(tx, trip), (e: unknown) => {
        assert.ok(e instanceof TripValidationError)
        assert.match((e as Error).message, /tidak mencukupi/)
        return true
      })
    })
  })

  it('5. visa owned → komponen visa = 0', async () => {
    await inRollback(async (tx) => {
      const trip = await baseTrip(tx, { visa: 'owned' })
      const calc = await calculateTrip(tx, trip)
      const visa = calc.items.find((i) => i.category === 'visa')
      assert.ok(visa)
      assert.equal(visa.amount, 0)
    })
  })

  it('6. visa needed → dikenakan harga × pax', async () => {
    await inRollback(async (tx) => {
      const trip = await baseTrip(tx, { visa: 'needed' })
      const calc = await calculateTrip(tx, trip)
      const visa = calc.items.find((i) => i.category === 'visa')
      assert.ok(visa && visa.amount > 0)
      assert.equal(visa.amount, 3100000 * 4)
    })
  })

  it('7. kapasitas kendaraan kurang → ditolak', async () => {
    await inRollback(async (tx) => {
      const trip = await baseTrip(tx, {
        pilgrims: 6,
        transport: [{ routeId: await routeId(tx, 'Bandara Jeddah → Makkah'), vehicleId: await vehicleId(tx, 'Sedan') }], // kap 3
      })
      await assert.rejects(() => calculateTrip(tx, trip), (e: unknown) => {
        assert.ok(e instanceof TripValidationError)
        assert.match((e as Error).message, /Kapasitas/)
        return true
      })
    })
  })

  it('8. layanan tambahan pax → harga × jamaah', async () => {
    await inRollback(async (tx) => {
      const trip = await baseTrip(tx, { services: [{ serviceId: await serviceId(tx, 'perlengkapan'), quantity: 1 }] })
      const calc = await calculateTrip(tx, trip)
      const line = calc.items.find((i) => i.category === 'services' && i.label === 'Perlengkapan Umroh')
      assert.ok(line)
      assert.equal(line.amount, 850000 * 4)
    })
  })

  it('9. layanan group_session → harga × quantity sesi', async () => {
    await inRollback(async (tx) => {
      const trip = await baseTrip(tx, { services: [{ serviceId: await serviceId(tx, 'muthawwif'), quantity: 3 }] })
      const calc = await calculateTrip(tx, trip)
      const line = calc.items.find((i) => i.category === 'services' && i.label === 'Muthawwif / Pendamping')
      assert.ok(line)
      assert.equal(line.amount, 1500000 * 3)
    })
  })

  it('10. resolusi periode memakai tanggal perjalanan (High Season override)', async () => {
    await inRollback(async (tx) => {
      const garuda = await flightId(tx, 'Garuda Indonesia')
      const highSeasonPeriod = await periodId(tx, 'High Season')
      // Beri Garuda & Sofitel Quad harga High Season agar kalkulasi lanjut sampai hotel —
      // perubahan harga hotel Makkah antar-periode jadi satu-satunya pembeda.
      await tx.insert(schema.pricingRecords).values([
        {
          entityType: 'flight', entityId: garuda, periodId: highSeasonPeriod, currency: 'IDR', pricingUnit: 'pax',
          strategy: 'manual', supplierCost: null, markupType: null, markupValue: null,
          sellingPrice: '17500000', internalNotes: 'test', isActive: true,
        },
        {
          entityType: 'hotel_room_type', entityId: await roomId(tx, await hotelId(tx, 'Sofitel Shahd Al Madinah'), 'Quad'),
          periodId: highSeasonPeriod, currency: 'IDR', pricingUnit: 'room_night',
          strategy: 'manual', supplierCost: null, markupType: null, markupValue: null,
          sellingPrice: '2900000', internalNotes: 'test', isActive: true,
        },
      ])
      const normal = await baseTrip(tx, { departureDate: '2026-10-12', makkahNights: 6, madinahNights: 5, visa: 'owned' })
      const highSeason = await baseTrip(tx, { departureDate: '2026-12-20', makkahNights: 6, madinahNights: 5, visa: 'owned' })
      const a = await calculateTrip(tx, normal)
      const b = await calculateTrip(tx, highSeason)
      const hotelA = a.items.filter((i) => i.category === 'hotel_makkah').reduce((s, i) => s + i.amount, 0)
      const hotelB = b.items.filter((i) => i.category === 'hotel_makkah').reduce((s, i) => s + i.amount, 0)
      assert.equal(hotelA, 4500000 * 6) // Normal: 4.500.000/malam
      assert.equal(hotelB, 5200000 * 6) // High Season override seed: 5.200.000/malam
    })
  })

  it('11. harga SAR dikonversi ke IDR dengan kurs aktif', async () => {
    await inRollback(async (tx) => {
      const { hotel, room } = await createFreshHotelRoom(tx, 'Makkah')
      await tx.insert(schema.pricingRecords).values({
        entityType: 'hotel_room_type',
        entityId: room.id,
        periodId: await periodId(tx, 'Normal'),
        currency: 'SAR',
        pricingUnit: 'room_night',
        strategy: 'manual',
        supplierCost: null,
        markupType: null,
        markupValue: null,
        sellingPrice: '1000',
        internalNotes: 'test',
        isActive: true,
      })
      const trip = await baseTrip(tx, {
        makkahHotelId: hotel.id,
        makkahRooms: [{ roomTypeId: room.id, quantity: 1 }],
      })
      const calc = await calculateTrip(tx, trip)
      const line = calc.items.find((i) => i.category === 'hotel_makkah')
      assert.ok(line)
      assert.equal(line.currency, 'SAR')
      assert.equal(line.amount, 1000 * 4350 * 6) // kurs seed 4350
    })
  })

  it('12. harga non-IDR tanpa kurs aktif → gagal (fail-closed)', async () => {
    await inRollback(async (tx) => {
      const { hotel, room } = await createFreshHotelRoom(tx, 'Makkah')
      await tx.insert(schema.pricingRecords).values({
        entityType: 'hotel_room_type',
        entityId: room.id,
        periodId: await periodId(tx, 'Normal'),
        currency: 'SAR',
        pricingUnit: 'room_night',
        strategy: 'manual',
        supplierCost: null,
        markupType: null,
        markupValue: null,
        sellingPrice: '1000',
        internalNotes: 'test',
        isActive: true,
      })
      // Nonaktifkan seluruh kurs SAR→IDR (transaksi → rollback mengembalikan).
      await tx
        .update(schema.exchangeRates)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(schema.exchangeRates.sourceCurrency, 'SAR'), eq(schema.exchangeRates.targetCurrency, 'IDR')))
      const trip = await baseTrip(tx, {
        makkahHotelId: hotel.id,
        makkahRooms: [{ roomTypeId: room.id, quantity: 1 }],
      })
      await assert.rejects(() => calculateTrip(tx, trip), (e: unknown) => {
        assert.ok(e instanceof TripPricingError)
        assert.match((e as Error).message, /kurs/)
        return true
      })
    })
  })

  it('13. produk nonaktif ditolak', async () => {
    await inRollback(async (tx) => {
      const trip = await baseTrip(tx)
      // Nonaktifkan flight Garuda sementara (rollback mengembalikan).
      const garudaId = await flightId(tx, 'Garuda Indonesia')
      await tx.update(schema.flights).set({ isActive: false, updatedAt: new Date() }).where(eq(schema.flights.id, garudaId))
      await assert.rejects(() => calculateTrip(tx, trip), (e: unknown) => {
        assert.ok(e instanceof TripValidationError)
        assert.match((e as Error).message, /penerbangan/)
        return true
      })
    })
  })

  it('14. snapshot konsisten: jumlah item tersimpan == total estimasi', async () => {
    await inRollback(async (tx) => {
      const trip = await baseTrip(tx)
      const calc = await calculateTrip(tx, trip)
      const estimation = await createEstimation(tx, {
        pilgrims: trip.pilgrims,
        departureCity: calc.departureCityName,
        departureDate: trip.departureDate,
        returnDate: calc.returnDate,
        durationDays: trip.durationDays,
        makkahNights: trip.makkahNights,
        madinahNights: trip.madinahNights,
        currency: 'IDR',
        totalAmount: calc.total,
        perPersonAmount: calc.perPerson,
        rates: calc.rates,
        items: calc.items.map((it, i) => ({
          category: it.category,
          label: it.label,
          detail: it.detail ?? null,
          unit: it.unit ?? null,
          unitPrice: it.unitPrice ?? null,
          currency: it.currency,
          quantity: it.quantity ?? null,
          amount: it.amount,
          meta: it.meta ?? {},
          sortOrder: i,
        })),
      })
      assert.ok(estimation)
      const stored = estimation.items.reduce((s, i) => s + Number(i.amount), 0)
      assert.equal(stored, Number(estimation.totalAmount))
    })
  })

  it('15. lead estimation dibuat setelah estimasi & mereferensikannya', async () => {
    await inRollback(async (tx) => {
      const trip = await baseTrip(tx)
      const calc = await calculateTrip(tx, trip)
      const estimation = await createEstimation(tx, {
        pilgrims: trip.pilgrims,
        departureCity: calc.departureCityName,
        departureDate: trip.departureDate,
        returnDate: calc.returnDate,
        durationDays: trip.durationDays,
        makkahNights: trip.makkahNights,
        madinahNights: trip.madinahNights,
        currency: 'IDR',
        totalAmount: calc.total,
        perPersonAmount: calc.perPerson,
        rates: calc.rates,
        items: [],
      })
      assert.ok(estimation)
      const lead = await createLead(tx, {
        name: 'Test User',
        whatsapp: '6281200000099',
        origin: 'estimation',
        source: 'trip-builder',
        estimationId: estimation.id,
      })
      assert.equal(lead.estimationId, estimation.id)
      assert.equal(lead.status, 'NEW')
    })
  })

  it('16. rollback transaksi: kegagalan tidak meninggalkan estimasi', async () => {
    const label = `ROLLBACK-TEST-${Date.now()}`
    await assert.rejects(
      db.transaction(async (tx) => {
        const trip = await baseTrip(tx)
        const calc = await calculateTrip(tx, trip)
        await createEstimation(tx, {
          pilgrims: trip.pilgrims,
          departureCity: calc.departureCityName,
          departureDate: trip.departureDate,
          returnDate: calc.returnDate,
          durationDays: trip.durationDays,
          makkahNights: trip.makkahNights,
          madinahNights: trip.madinahNights,
          currency: 'IDR',
          totalAmount: calc.total,
          perPersonAmount: calc.perPerson,
          rates: calc.rates,
          items: [{ category: 'flight', label, unit: 'pax', currency: 'IDR', amount: 1, sortOrder: 0 }],
        })
        throw new Error('simulasi kegagalan setelah insert')
      }),
    )
    const leftovers = await db.select().from(schema.estimationItems).where(eq(schema.estimationItems.label, label))
    assert.equal(leftovers.length, 0, 'item tidak boleh tersisa setelah rollback')
  })

  it('18. returnDate = departure + (durasi − 1) — Contoh A (M3.1)', async () => {
    await inRollback(async (tx) => {
      const trip = await baseTrip(tx, {
        departureDate: '2026-10-01',
        durationDays: 9,
        makkahNights: 4,
        madinahNights: 4,
      })
      const calc = await calculateTrip(tx, trip)
      assert.equal(calc.returnDate, '2026-10-09')
      assert.equal(trip.makkahNights + trip.madinahNights, 8)
    })
  })

  it('19. returnDate = departure + (durasi − 1) — Contoh B (M3.1)', async () => {
    await inRollback(async (tx) => {
      // 20 Des 2026 jatuh di periode High Season seed — siapkan harga HS
      // untuk flight & hotel Madinah agar kalkulasi lanjut sampai selesai.
      const highSeasonPeriod = await periodId(tx, 'High Season')
      await tx.insert(schema.pricingRecords).values([
        {
          entityType: 'flight', entityId: await flightId(tx, 'Garuda Indonesia'), periodId: highSeasonPeriod,
          currency: 'IDR', pricingUnit: 'pax', strategy: 'manual', supplierCost: null, markupType: null,
          markupValue: null, sellingPrice: '18000000', internalNotes: 'test', isActive: true,
        },
        {
          entityType: 'hotel_room_type', entityId: await roomId(tx, await hotelId(tx, 'Sofitel Shahd Al Madinah'), 'Quad'),
          periodId: highSeasonPeriod, currency: 'IDR', pricingUnit: 'room_night', strategy: 'manual',
          supplierCost: null, markupType: null, markupValue: null, sellingPrice: '3100000',
          internalNotes: 'test', isActive: true,
        },
      ])
      const trip = await baseTrip(tx, {
        departureDate: '2026-12-20',
        durationDays: 12,
        makkahNights: 6,
        madinahNights: 5,
        visa: 'owned',
      })
      const calc = await calculateTrip(tx, trip)
      assert.equal(calc.returnDate, '2026-12-31')
      assert.equal(trip.makkahNights + trip.madinahNights, 11)
    })
  })

  it('17. EST-ID: format EST-xxxxxx & unik', async () => {
    await inRollback(async (tx) => {
      const trip = await baseTrip(tx)
      const calc = await calculateTrip(tx, trip)
      const a = await createEstimation(tx, { ...minimalSnapshot(trip, calc), items: [] })
      const b = await createEstimation(tx, { ...minimalSnapshot(trip, calc), items: [] })
      assert.match(a!.estimationNumber, /^EST-\d{6}$/)
      assert.notEqual(a!.estimationNumber, b!.estimationNumber)
    })
  })
})

function minimalSnapshot(trip: TripInput, calc: Awaited<ReturnType<typeof calculateTrip>>) {
  return {
    pilgrims: trip.pilgrims,
    departureCity: calc.departureCityName,
    departureDate: trip.departureDate,
    returnDate: calc.returnDate,
    durationDays: trip.durationDays,
    makkahNights: trip.makkahNights,
    madinahNights: trip.madinahNights,
    currency: 'IDR',
    totalAmount: calc.total,
    perPersonAmount: calc.perPerson,
    rates: calc.rates,
  }
}
