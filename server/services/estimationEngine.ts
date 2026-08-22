import { and, eq, inArray } from 'drizzle-orm'
import {
  departureCities,
  flights,
  hotelRoomTypes,
  hotels,
  services,
  transportRouteVehicles,
  transportRoutes,
  transportVehicles,
} from '../db/schema'
import type { DbLike } from '../db'
import { getActiveRate, resolvePrice, toIdr } from './pricing'

/**
 * ESTIMATION ENGINE — kalkulasi otoritatif Trip Builder (M3).
 * Backend adalah satu-satunya sumber kebenaran: client TIDAK pernah
 * dipercaya untuk harga/total. Semua harga di-resolve server-side
 * dengan tanggal perjalanan customer (bukan "hari ini").
 *
 * Fail-safe: komponen yang tidak bisa di-resolve ke IDR (kurs hilang,
 * harga tidak ada) → submission GAGAL total, tidak ada estimasi parsial.
 */

export class TripValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TripValidationError'
  }
}

export class TripPricingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TripPricingError'
  }
}

// ─── Tipe input (payload customer — hanya ID + konfigurasi, tanpa harga) ────
export interface TripRoomSelection {
  roomTypeId: number
  quantity: number
}
export interface TripTransportSelection {
  routeId: number
  vehicleId: number
}
export interface TripServiceSelection {
  serviceId: number
  quantity: number
}
export interface TripInput {
  pilgrims: number
  departureCity: string // code: 'jakarta' | 'bandung'
  departureDate: string // yyyy-mm-dd
  durationDays: number
  makkahNights: number
  madinahNights: number
  flightId: number
  makkahHotelId: number
  makkahRooms: TripRoomSelection[]
  madinahHotelId: number
  madinahRooms: TripRoomSelection[]
  transport: TripTransportSelection[]
  visa: 'needed' | 'owned'
  services: TripServiceSelection[]
}

export interface TripLine {
  category: string
  label: string
  detail?: string
  unit?: string
  unitPrice?: number | null
  currency: string
  quantity?: number | null
  amount: number
  meta?: Record<string, unknown>
}

export interface TripCalculation {
  items: TripLine[]
  total: number
  perPerson: number
  rates: Array<{ sourceCurrency: string; targetCurrency: string; rate: number }>
  departureCityName: string
  returnDate: string
}

const fmt = (n: number) => n.toLocaleString('id-ID')

function roomCapacitySum(rooms: TripRoomSelection[], map: Map<number, { capacity: number }>): number {
  return rooms.reduce((sum, sel) => sum + (map.get(sel.roomTypeId)?.capacity ?? 0) * sel.quantity, 0)
}

async function resolveOrFail(
  db: DbLike,
  entityType: string,
  entityId: number,
  date: string,
  label: string,
): Promise<{ priceIdr: number; sellingPrice: number; currency: string; rateUsed: number | null; unit: string }> {
  const price = await resolvePrice(db, { entityType, entityId }, date)
  if (!price) {
    throw new TripPricingError(`Harga untuk ${label} belum tersedia untuk tanggal perjalanan Anda. Silakan ubah pilihan atau hubungi kami.`)
  }
  if (price.sellingPriceIdr === null) {
    throw new TripPricingError(
      `Harga ${label} belum bisa dikonversi ke Rupiah (kurs belum tersedia). Silakan hubungi tim kami.`,
    )
  }
  return {
    priceIdr: price.sellingPriceIdr,
    sellingPrice: price.sellingPrice,
    currency: price.currency,
    rateUsed: price.rateUsed,
    unit: price.record.pricingUnit,
  }
}

export async function calculateTrip(db: DbLike, trip: TripInput): Promise<TripCalculation> {
  const items: TripLine[] = []
  const rates = new Map<string, { sourceCurrency: string; targetCurrency: string; rate: number }>()

  const recordRate = (source: string, rate: number) => {
    const key = `${source}:IDR`
    if (!rates.has(key)) rates.set(key, { sourceCurrency: source, targetCurrency: 'IDR', rate })
  }

  // ─── 0. Aturan terkunci ───────────────────────────────────────────────────
  const date = new Date(`${trip.departureDate}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) throw new TripValidationError('Tanggal keberangkatan tidak valid.')
  if (trip.makkahNights + trip.madinahNights !== trip.durationDays - 1) {
    throw new TripValidationError('Pembagian malam tidak sesuai durasi: Makkah + Madinah harus sama dengan durasi − 1.')
  }
  const returnDate = new Date(date.getTime())
  returnDate.setUTCDate(returnDate.getUTCDate() + trip.durationDays)
  const returnIso = returnDate.toISOString().slice(0, 10)

  // ─── 1. Kota keberangkatan ────────────────────────────────────────────────
  const cityRows = await db.select().from(departureCities).where(eq(departureCities.code, trip.departureCity)).limit(1)
  const city = cityRows[0]
  if (!city || !city.isActive) throw new TripValidationError('Kota keberangkatan tidak tersedia. Silakan pilih ulang.')
  if (city.feePerPax !== null && Number(city.feePerPax) > 0) {
    const feeCurrency = city.feeCurrency
    const feePerPax = Number(city.feePerPax)
    let feePerPaxIdr: number
    if (feeCurrency === 'IDR') {
      feePerPaxIdr = feePerPax
    } else {
      const rateRow = await getActiveRate(db, feeCurrency, 'IDR')
      if (!rateRow) {
        throw new TripPricingError('Biaya keberangkatan belum bisa dikonversi ke Rupiah (kurs belum tersedia). Silakan hubungi kami.')
      }
      feePerPaxIdr = toIdr(feePerPax, Number(rateRow.rate))
      recordRate(feeCurrency, Number(rateRow.rate))
    }
    items.push({
      category: 'departure',
      label: `Perjalanan ${city.name} → Bandara CGK`,
      detail: `${fmt(feePerPaxIdr)} × ${trip.pilgrims} jamaah`,
      unit: 'pax',
      unitPrice: feePerPaxIdr,
      currency: 'IDR',
      quantity: trip.pilgrims,
      amount: feePerPaxIdr * trip.pilgrims,
      meta: { departureCityId: city.id },
    })
  }

  // ─── 2. Penerbangan ───────────────────────────────────────────────────────
  const flightRows = await db.select().from(flights).where(eq(flights.id, trip.flightId)).limit(1)
  const flight = flightRows[0]
  if (!flight || !flight.isActive) throw new TripValidationError('Pilihan penerbangan tidak tersedia. Silakan pilih ulang.')
  const flightPrice = await resolveOrFail(db, 'flight', flight.id, trip.departureDate, `penerbangan ${flight.airline}`)
  if (flightPrice.rateUsed) recordRate(flightPrice.currency, flightPrice.rateUsed)
  items.push({
    category: 'flight',
    label: 'Penerbangan',
    detail: `${flight.airline} · ${flight.routeLabel} — ${fmt(flightPrice.sellingPrice)} ${flightPrice.currency} × ${trip.pilgrims} jamaah`,
    unit: 'pax',
    unitPrice: flightPrice.sellingPrice,
    currency: flightPrice.currency,
    quantity: trip.pilgrims,
    amount: flightPrice.priceIdr * trip.pilgrims,
    meta: { flightId: flight.id },
  })

  // ─── 3–4. Hotel Makkah & Madinah ──────────────────────────────────────────
  for (const [cityKey, hotelId, rooms, nights] of [
    ['hotel_makkah', trip.makkahHotelId, trip.makkahRooms, trip.makkahNights],
    ['hotel_madinah', trip.madinahHotelId, trip.madinahRooms, trip.madinahNights],
  ] as const) {
    const expectedCity = cityKey === 'hotel_makkah' ? 'Makkah' : 'Madinah'
    const hotelRows = await db.select().from(hotels).where(eq(hotels.id, hotelId)).limit(1)
    const hotel = hotelRows[0]
    if (!hotel || !hotel.isActive) throw new TripValidationError(`Hotel di ${expectedCity} tidak tersedia. Silakan pilih ulang.`)
    if (hotel.city !== expectedCity) throw new TripValidationError(`Hotel ${hotel.name} bukan hotel ${expectedCity}.`)

    const roomTypeIds = rooms.map((r) => r.roomTypeId)
    const roomRows = roomTypeIds.length
      ? await db
          .select()
          .from(hotelRoomTypes)
          .where(and(eq(hotelRoomTypes.hotelId, hotel.id), inArray(hotelRoomTypes.id, roomTypeIds)))
      : []
    const roomById = new Map(roomRows.map((r) => [r.id, r]))

    for (const sel of rooms) {
      const rt = roomById.get(sel.roomTypeId)
      if (!rt || !rt.isActive) throw new TripValidationError(`Tipe kamar tidak tersedia di ${hotel.name}. Silakan pilih ulang.`)
    }
    const capacity = roomCapacitySum(rooms, roomById)
    if (capacity < trip.pilgrims) {
      throw new TripValidationError(
        `Kapasitas kamar di ${hotel.name} (${capacity} orang) tidak mencukupi untuk ${trip.pilgrims} jamaah.`,
      )
    }

    for (const sel of rooms) {
      const rt = roomById.get(sel.roomTypeId)!
      const price = await resolveOrFail(db, 'hotel_room_type', rt.id, trip.departureDate, `kamar ${rt.name} di ${hotel.name}`)
      if (price.rateUsed) recordRate(price.currency, price.rateUsed)
      const amount = price.priceIdr * sel.quantity * nights
      items.push({
        category: cityKey,
        label: `Hotel ${expectedCity} — ${hotel.name}`,
        detail: `${rt.name} × ${sel.quantity} kamar · ${nights} malam · ${fmt(price.sellingPrice)} ${price.currency}/kamar/malam`,
        unit: 'room_night',
        unitPrice: price.sellingPrice,
        currency: price.currency,
        quantity: sel.quantity,
        amount,
        meta: { hotelId: hotel.id, roomTypeId: rt.id, nights, roomName: rt.name },
      })
    }
  }

  // ─── 5. Transportasi ──────────────────────────────────────────────────────
  for (const sel of trip.transport) {
    const routeRows = await db.select().from(transportRoutes).where(eq(transportRoutes.id, sel.routeId)).limit(1)
    const route = routeRows[0]
    if (!route || !route.isActive) throw new TripValidationError('Rute transportasi tidak tersedia. Silakan pilih ulang.')

    const vehicleRows = await db.select().from(transportVehicles).where(eq(transportVehicles.id, sel.vehicleId)).limit(1)
    const vehicle = vehicleRows[0]
    if (!vehicle || !vehicle.isActive) throw new TripValidationError('Kendaraan tidak tersedia. Silakan pilih ulang.')

    const optionRows = await db
      .select()
      .from(transportRouteVehicles)
      .where(and(eq(transportRouteVehicles.routeId, sel.routeId), eq(transportRouteVehicles.vehicleId, sel.vehicleId), eq(transportRouteVehicles.isActive, true)))
      .limit(1)
    const option = optionRows[0]
    if (!option) throw new TripValidationError(`Kendaraan ${vehicle.name} tidak tersedia untuk rute ${route.name}.`)

    if (vehicle.capacity < trip.pilgrims) {
      throw new TripValidationError(`Kapasitas ${vehicle.name} (${vehicle.capacity}) tidak mencukupi untuk ${trip.pilgrims} jamaah.`)
    }

    const price = await resolveOrFail(db, 'route_vehicle', option.id, trip.departureDate, `transportasi ${route.name} (${vehicle.name})`)
    if (price.rateUsed) recordRate(price.currency, price.rateUsed)
    items.push({
      category: 'transport',
      label: route.name,
      detail: vehicle.name,
      unit: 'vehicle_trip',
      unitPrice: price.sellingPrice,
      currency: price.currency,
      quantity: 1,
      amount: price.priceIdr,
      meta: { routeId: route.id, vehicleId: vehicle.id, optionId: option.id },
    })
  }

  // ─── 6. Visa ──────────────────────────────────────────────────────────────
  if (trip.visa === 'owned') {
    items.push({
      category: 'visa',
      label: 'Visa Umroh',
      detail: 'Sudah memiliki visa — tidak ada biaya',
      unit: 'pax',
      unitPrice: 0,
      currency: 'IDR',
      quantity: trip.pilgrims,
      amount: 0,
      meta: { visa: 'owned' },
    })
  } else {
    const visaRows = await db.select().from(services).where(eq(services.code, 'visa')).limit(1)
    const visa = visaRows[0]
    if (!visa || !visa.isActive) throw new TripValidationError('Layanan visa belum tersedia. Silakan hubungi kami.')
    const price = await resolveOrFail(db, 'service', visa.id, trip.departureDate, 'visa umroh')
    if (price.rateUsed) recordRate(price.currency, price.rateUsed)
    items.push({
      category: 'visa',
      label: 'Visa Umroh',
      detail: `${fmt(price.sellingPrice)} ${price.currency} × ${trip.pilgrims} jamaah`,
      unit: 'pax',
      unitPrice: price.sellingPrice,
      currency: price.currency,
      quantity: trip.pilgrims,
      amount: price.priceIdr * trip.pilgrims,
      meta: { serviceId: visa.id, visa: 'needed' },
    })
  }

  // ─── 7. Layanan tambahan ──────────────────────────────────────────────────
  for (const sel of trip.services) {
    const svcRows = await db.select().from(services).where(eq(services.id, sel.serviceId)).limit(1)
    const svc = svcRows[0]
    if (!svc || !svc.isActive) throw new TripValidationError('Salah satu layanan tambahan tidak tersedia. Silakan pilih ulang.')
    if (!svc.inTripBuilder) throw new TripValidationError(`Layanan ${svc.name} tidak tersedia di Trip Builder.`)
    if (svc.pricingUnit !== 'pax' && svc.pricingUnit !== 'group_session') {
      throw new TripValidationError(`Layanan ${svc.name} tidak dapat dihitung otomatis. Silakan hubungi kami.`)
    }
    const price = await resolveOrFail(db, 'service', svc.id, trip.departureDate, `layanan ${svc.name}`)
    if (price.rateUsed) recordRate(price.currency, price.rateUsed)
    const qty = svc.pricingUnit === 'pax' ? trip.pilgrims : sel.quantity
    items.push({
      category: 'services',
      label: svc.name,
      detail:
        svc.pricingUnit === 'pax'
          ? `${fmt(price.sellingPrice)} ${price.currency} × ${trip.pilgrims} jamaah`
          : `${fmt(price.sellingPrice)} ${price.currency} × ${sel.quantity} sesi`,
      unit: svc.pricingUnit,
      unitPrice: price.sellingPrice,
      currency: price.currency,
      quantity: qty,
      amount: price.priceIdr * qty,
      meta: { serviceId: svc.id },
    })
  }

  // ─── Total ────────────────────────────────────────────────────────────────
  const total = Math.round(items.reduce((sum, i) => sum + i.amount, 0))
  const perPerson = trip.pilgrims > 0 ? Math.round(total / trip.pilgrims) : 0

  return {
    items,
    total,
    perPerson,
    rates: [...rates.values()],
    departureCityName: city.name,
    returnDate: returnIso,
  }
}
