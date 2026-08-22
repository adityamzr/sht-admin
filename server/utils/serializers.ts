import type {
  DepartureCityRow,
  FlightRow,
  HotelRow,
  RoomTypeRow,
  RouteVehicleRow,
  RouteRow,
  ServiceRow,
  VehicleRow,
} from './rowTypes'

/**
 * Serializer eksplisit (field-by-field).
 * ATURAN KERAS: API PUBLIK tidak boleh membocorkan supplier_cost, markup,
 * internal_notes, atau metadata admin. Tidak ada raw DB row yang dikembalikan.
 * Harga jual (selling) dikomputasi server-side; serializer hanya memetakan.
 */

export interface PublicPrice {
  sellingPrice: number
  currency: string
  /** null = mata uang non-IDR tanpa kurs aktif — jangan pernah tampilkan 1:1 */
  sellingPriceIdr: number | null
}

export function toNumber(v: unknown): number {
  return typeof v === 'string' ? Number(v) : Number(v ?? 0)
}

// ─── PUBLIC (sht-web / customer) ────────────────────────────────────────────

export function publicDepartureCity(city: DepartureCityRow, feePerPaxIdr: number | null) {
  return {
    id: city.id,
    code: city.code,
    name: city.name,
    feePerPax: city.feePerPax === null ? null : toNumber(city.feePerPax),
    feeCurrency: city.feeCurrency,
    feePerPaxIdr,
  }
}

export function publicRoomType(rt: RoomTypeRow, price: PublicPrice | null) {
  return {
    id: rt.id,
    name: rt.name,
    capacity: rt.capacity,
    pricePerNight: price ? price.sellingPrice : null,
    pricePerNightIdr: price ? price.sellingPriceIdr : null,
    currency: price ? price.currency : 'IDR',
  }
}

export function publicHotel(hotel: HotelRow, roomTypes: Array<{ roomType: RoomTypeRow; price: PublicPrice | null }>) {
  return {
    id: hotel.id,
    name: hotel.name,
    city: hotel.city,
    starRating: hotel.starRating,
    distanceLabel: hotel.distanceLabel,
    description: hotel.description,
    coverImage: hotel.coverImage,
    roomTypes: roomTypes.map((r) => publicRoomType(r.roomType, r.price)),
  }
}

export function publicFlight(flight: FlightRow, price: PublicPrice | null) {
  return {
    id: flight.id,
    airline: flight.airline,
    routeLabel: flight.routeLabel,
    origin: flight.origin,
    destination: flight.destination,
    flightType: flight.flightType,
    baggage: flight.baggage,
    pricePerPax: price ? price.sellingPrice : null,
    pricePerPaxIdr: price ? price.sellingPriceIdr : null,
    currency: price ? price.currency : 'IDR',
  }
}

export function publicVehicle(vehicle: VehicleRow) {
  return {
    id: vehicle.id,
    name: vehicle.name,
    capacity: vehicle.capacity,
    luggageLabel: vehicle.luggageLabel,
    description: vehicle.description,
  }
}

export function publicTransportation(
  route: RouteRow,
  options: Array<{ option: RouteVehicleRow; vehicle: VehicleRow; price: PublicPrice | null }>,
) {
  return {
    id: route.id,
    name: route.name,
    pickup: route.pickup,
    destination: route.destination,
    description: route.description,
    vehicleOptions: options.map((o) => ({
      id: o.option.id,
      vehicle: publicVehicle(o.vehicle),
      pricePerTrip: o.price ? o.price.sellingPrice : null,
      pricePerTripIdr: o.price ? o.price.sellingPriceIdr : null,
      currency: o.price ? o.price.currency : 'IDR',
    })),
  }
}

export function publicService(service: ServiceRow, price: PublicPrice | null) {
  return {
    id: service.id,
    code: service.code,
    name: service.name,
    description: service.description,
    category: service.category,
    pricingUnit: service.pricingUnit,
    price: price ? price.sellingPrice : null,
    priceIdr: price ? price.sellingPriceIdr : null,
    currency: price ? price.currency : 'IDR',
  }
}

// ─── ADMIN (panel internal — boleh memuat data internal) ────────────────────

export function adminDepartureCity(c: DepartureCityRow) {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    feePerPax: c.feePerPax === null ? null : toNumber(c.feePerPax),
    feeCurrency: c.feeCurrency,
    isActive: c.isActive,
    sortOrder: c.sortOrder,
  }
}

export function adminHotel(h: HotelRow, roomTypes: RoomTypeRow[]) {
  return {
    id: h.id,
    name: h.name,
    city: h.city,
    starRating: h.starRating,
    distanceLabel: h.distanceLabel,
    description: h.description,
    coverImage: h.coverImage,
    gallery: h.gallery,
    isActive: h.isActive,
    sortOrder: h.sortOrder,
    roomTypes: roomTypes.map(adminRoomType),
  }
}

export function adminRoomType(rt: RoomTypeRow) {
  return {
    id: rt.id,
    hotelId: rt.hotelId,
    name: rt.name,
    capacity: rt.capacity,
    isActive: rt.isActive,
    sortOrder: rt.sortOrder,
  }
}

export function adminFlight(f: FlightRow) {
  return {
    id: f.id,
    airline: f.airline,
    routeLabel: f.routeLabel,
    origin: f.origin,
    destination: f.destination,
    flightType: f.flightType,
    baggage: f.baggage,
    isActive: f.isActive,
    sortOrder: f.sortOrder,
  }
}

export function adminVehicle(v: VehicleRow) {
  return {
    id: v.id,
    name: v.name,
    capacity: v.capacity,
    luggageLabel: v.luggageLabel,
    description: v.description,
    image: v.image,
    isActive: v.isActive,
    sortOrder: v.sortOrder,
  }
}

export function adminRoute(r: RouteRow) {
  return {
    id: r.id,
    name: r.name,
    pickup: r.pickup,
    destination: r.destination,
    description: r.description,
    isActive: r.isActive,
    sortOrder: r.sortOrder,
  }
}

export function adminService(s: ServiceRow) {
  return {
    id: s.id,
    code: s.code,
    name: s.name,
    description: s.description,
    category: s.category,
    pricingUnit: s.pricingUnit,
    inTripBuilder: s.inTripBuilder,
    standalone: s.standalone,
    image: s.image,
    isActive: s.isActive,
    sortOrder: s.sortOrder,
  }
}

export function adminPricingPeriod(p: PricingPeriodRow) {
  return {
    id: p.id,
    name: p.name,
    startDate: p.startDate instanceof Date ? p.startDate.toISOString().slice(0, 10) : String(p.startDate),
    endDate: p.endDate instanceof Date ? p.endDate.toISOString().slice(0, 10) : String(p.endDate),
    priority: p.priority,
    isActive: p.isActive,
  }
}

export function adminExchangeRate(r: ExchangeRateRow) {
  return {
    id: r.id,
    sourceCurrency: r.sourceCurrency,
    targetCurrency: r.targetCurrency,
    rate: toNumber(r.rate),
    isActive: r.isActive,
    effectiveAt: r.effectiveAt,
  }
}

export function adminPricingRecord(r: PricingRecordRow, sellingPrice: number) {
  return {
    id: r.id,
    entityType: r.entityType,
    entityId: r.entityId,
    periodId: r.periodId,
    currency: r.currency,
    pricingUnit: r.pricingUnit,
    strategy: r.strategy,
    supplierCost: r.supplierCost === null ? null : toNumber(r.supplierCost),
    markupType: r.markupType,
    markupValue: r.markupValue === null ? null : toNumber(r.markupValue),
    sellingPrice: r.sellingPrice === null ? null : toNumber(r.sellingPrice),
    internalNotes: r.internalNotes,
    isActive: r.isActive,
    computedSellingPrice: sellingPrice,
  }
}
