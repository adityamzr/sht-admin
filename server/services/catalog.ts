import { and, asc, eq, isNull } from 'drizzle-orm'
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
import type { Db } from '../db'

/**
 * Katalog admin: CRUD + soft-delete (deleted_at) untuk entitas bisnis.
 * Semua harga DI LUAR layer ini — lihat services/pricing.ts.
 */

// ─── Departure Cities ───────────────────────────────────────────────────────
export async function listDepartureCities(db: Db) {
  return db.select().from(departureCities).where(isNull(departureCities.deletedAt)).orderBy(asc(departureCities.sortOrder))
}
export async function getDepartureCity(db: Db, id: number) {
  const rows = await db.select().from(departureCities).where(and(eq(departureCities.id, id), isNull(departureCities.deletedAt))).limit(1)
  return rows[0] ?? null
}
export async function createDepartureCity(db: Db, input: Record<string, unknown>) {
  const rows = await db.insert(departureCities).values(input as never).returning()
  return rows[0]
}
export async function updateDepartureCity(db: Db, id: number, patch: Record<string, unknown>) {
  const rows = await db
    .update(departureCities)
    .set({ ...patch, updatedAt: new Date() } as never)
    .where(eq(departureCities.id, id))
    .returning()
  return rows[0] ?? null
}
export async function softDeleteDepartureCity(db: Db, id: number) {
  const rows = await db
    .update(departureCities)
    .set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(departureCities.id, id))
    .returning({ id: departureCities.id })
  return rows[0] ?? null
}

// ─── Hotels ─────────────────────────────────────────────────────────────────
export async function listHotels(db: Db) {
  return db.select().from(hotels).where(isNull(hotels.deletedAt)).orderBy(asc(hotels.sortOrder), asc(hotels.id))
}
export async function getHotel(db: Db, id: number) {
  const rows = await db.select().from(hotels).where(and(eq(hotels.id, id), isNull(hotels.deletedAt))).limit(1)
  return rows[0] ?? null
}
export async function createHotel(db: Db, input: Record<string, unknown>) {
  const rows = await db.insert(hotels).values(input as never).returning()
  return rows[0]
}
export async function updateHotel(db: Db, id: number, patch: Record<string, unknown>) {
  const rows = await db.update(hotels).set({ ...patch, updatedAt: new Date() } as never).where(eq(hotels.id, id)).returning()
  return rows[0] ?? null
}
export async function softDeleteHotel(db: Db, id: number) {
  const rows = await db
    .update(hotels)
    .set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(hotels.id, id))
    .returning({ id: hotels.id })
  return rows[0] ?? null
}

// ─── Room Types ─────────────────────────────────────────────────────────────
export async function listRoomTypes(db: Db, hotelId?: number) {
  const cond = [isNull(hotelRoomTypes.deletedAt)]
  if (hotelId !== undefined) cond.push(eq(hotelRoomTypes.hotelId, hotelId))
  return db.select().from(hotelRoomTypes).where(and(...cond)).orderBy(asc(hotelRoomTypes.sortOrder))
}
export async function getRoomType(db: Db, id: number) {
  const rows = await db.select().from(hotelRoomTypes).where(and(eq(hotelRoomTypes.id, id), isNull(hotelRoomTypes.deletedAt))).limit(1)
  return rows[0] ?? null
}
export async function createRoomType(db: Db, input: Record<string, unknown>) {
  const rows = await db.insert(hotelRoomTypes).values(input as never).returning()
  return rows[0]
}
export async function updateRoomType(db: Db, id: number, patch: Record<string, unknown>) {
  const rows = await db.update(hotelRoomTypes).set({ ...patch, updatedAt: new Date() } as never).where(eq(hotelRoomTypes.id, id)).returning()
  return rows[0] ?? null
}
export async function softDeleteRoomType(db: Db, id: number) {
  const rows = await db
    .update(hotelRoomTypes)
    .set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(hotelRoomTypes.id, id))
    .returning({ id: hotelRoomTypes.id })
  return rows[0] ?? null
}

// ─── Flights ────────────────────────────────────────────────────────────────
export async function listFlights(db: Db) {
  return db.select().from(flights).where(isNull(flights.deletedAt)).orderBy(asc(flights.sortOrder))
}
export async function getFlight(db: Db, id: number) {
  const rows = await db.select().from(flights).where(and(eq(flights.id, id), isNull(flights.deletedAt))).limit(1)
  return rows[0] ?? null
}
export async function createFlight(db: Db, input: Record<string, unknown>) {
  const rows = await db.insert(flights).values(input as never).returning()
  return rows[0]
}
export async function updateFlight(db: Db, id: number, patch: Record<string, unknown>) {
  const rows = await db.update(flights).set({ ...patch, updatedAt: new Date() } as never).where(eq(flights.id, id)).returning()
  return rows[0] ?? null
}
export async function softDeleteFlight(db: Db, id: number) {
  const rows = await db
    .update(flights)
    .set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(flights.id, id))
    .returning({ id: flights.id })
  return rows[0] ?? null
}

// ─── Vehicles ───────────────────────────────────────────────────────────────
export async function listVehicles(db: Db) {
  return db.select().from(transportVehicles).where(isNull(transportVehicles.deletedAt)).orderBy(asc(transportVehicles.sortOrder))
}
export async function getVehicle(db: Db, id: number) {
  const rows = await db.select().from(transportVehicles).where(and(eq(transportVehicles.id, id), isNull(transportVehicles.deletedAt))).limit(1)
  return rows[0] ?? null
}
export async function createVehicle(db: Db, input: Record<string, unknown>) {
  const rows = await db.insert(transportVehicles).values(input as never).returning()
  return rows[0]
}
export async function updateVehicle(db: Db, id: number, patch: Record<string, unknown>) {
  const rows = await db
    .update(transportVehicles)
    .set({ ...patch, updatedAt: new Date() } as never)
    .where(eq(transportVehicles.id, id))
    .returning()
  return rows[0] ?? null
}
export async function softDeleteVehicle(db: Db, id: number) {
  const rows = await db
    .update(transportVehicles)
    .set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(transportVehicles.id, id))
    .returning({ id: transportVehicles.id })
  return rows[0] ?? null
}

// ─── Routes ─────────────────────────────────────────────────────────────────
export async function listRoutes(db: Db) {
  return db.select().from(transportRoutes).where(isNull(transportRoutes.deletedAt)).orderBy(asc(transportRoutes.sortOrder))
}
export async function getRoute(db: Db, id: number) {
  const rows = await db.select().from(transportRoutes).where(and(eq(transportRoutes.id, id), isNull(transportRoutes.deletedAt))).limit(1)
  return rows[0] ?? null
}
export async function createRoute(db: Db, input: Record<string, unknown>) {
  const rows = await db.insert(transportRoutes).values(input as never).returning()
  return rows[0]
}
export async function updateRoute(db: Db, id: number, patch: Record<string, unknown>) {
  const rows = await db.update(transportRoutes).set({ ...patch, updatedAt: new Date() } as never).where(eq(transportRoutes.id, id)).returning()
  return rows[0] ?? null
}
export async function softDeleteRoute(db: Db, id: number) {
  const rows = await db
    .update(transportRoutes)
    .set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(transportRoutes.id, id))
    .returning({ id: transportRoutes.id })
  return rows[0] ?? null
}

// ─── Route × Vehicle options ────────────────────────────────────────────────
export async function listRouteVehicles(db: Db, routeId?: number) {
  const cond = []
  if (routeId !== undefined) cond.push(eq(transportRouteVehicles.routeId, routeId))
  return db.select().from(transportRouteVehicles).where(cond.length ? and(...cond) : undefined)
}
export async function upsertRouteVehicle(db: Db, routeId: number, vehicleId: number) {
  const rows = await db
    .insert(transportRouteVehicles)
    .values({ routeId, vehicleId, isActive: true })
    .onConflictDoUpdate({
      target: [transportRouteVehicles.routeId, transportRouteVehicles.vehicleId],
      set: { isActive: true, updatedAt: new Date() },
    })
    .returning()
  return rows[0]
}
export async function updateRouteVehicle(db: Db, id: number, patch: { isActive: boolean }) {
  const rows = await db
    .update(transportRouteVehicles)
    .set({ isActive: patch.isActive, updatedAt: new Date() })
    .where(eq(transportRouteVehicles.id, id))
    .returning()
  return rows[0] ?? null
}

// ─── Services ───────────────────────────────────────────────────────────────
export async function listServices(db: Db) {
  return db.select().from(services).where(isNull(services.deletedAt)).orderBy(asc(services.sortOrder))
}
export async function getService(db: Db, id: number) {
  const rows = await db.select().from(services).where(and(eq(services.id, id), isNull(services.deletedAt))).limit(1)
  return rows[0] ?? null
}
export async function getServiceByCode(db: Db, code: string) {
  const rows = await db.select().from(services).where(and(eq(services.code, code), isNull(services.deletedAt))).limit(1)
  return rows[0] ?? null
}
export async function createService(db: Db, input: Record<string, unknown>) {
  const rows = await db.insert(services).values(input as never).returning()
  return rows[0]
}
export async function updateService(db: Db, id: number, patch: Record<string, unknown>) {
  const rows = await db.update(services).set({ ...patch, updatedAt: new Date() } as never).where(eq(services.id, id)).returning()
  return rows[0] ?? null
}
export async function softDeleteService(db: Db, id: number) {
  const rows = await db
    .update(services)
    .set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(services.id, id))
    .returning({ id: services.id })
  return rows[0] ?? null
}
