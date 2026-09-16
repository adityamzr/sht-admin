import { and, asc, desc, eq, ilike, isNull, or, sql, count } from 'drizzle-orm'
import {
  tourCustomers,
  tourOrders,
  tourJamaah,
  tourTrips,
  tourTripOrders,
  tourVendors,
  tourBookings,
  workspaces,
  adminUsers,
  leads,
  estimations,
} from '../db/schema'
import type { DbLike } from '../db'

// ─── Helpers ────────────────────────────────────────────────────────────────
export async function getTourWorkspaceId(db: DbLike): Promise<number> {
  const rows = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.key, 'tour')).limit(1)
  if (rows[0]) return rows[0].id
  // fallback: first workspace or 1
  const any = await db.select({ id: workspaces.id }).from(workspaces).limit(1)
  return any[0]?.id ?? 1
}

function notDeleted(table: any) {
  return isNull(table.deletedAt)
}

// ─── Customers ──────────────────────────────────────────────────────────────
export interface ListCustomersFilter {
  workspaceId: number
  search?: string
  customerType?: string
  source?: string
  page?: number
  pageSize?: number
}

export async function listTourCustomers(db: DbLike, f: ListCustomersFilter) {
  const page = Math.max(1, f.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, f.pageSize ?? 20))
  const offset = (page - 1) * pageSize

  const conds: any[] = [eq(tourCustomers.workspaceId, f.workspaceId), notDeleted(tourCustomers)]
  if (f.customerType) conds.push(eq(tourCustomers.customerType, f.customerType))
  if (f.source) conds.push(eq(tourCustomers.source, f.source))
  if (f.search) {
    const s = `%${f.search}%`
    conds.push(or(ilike(tourCustomers.name, s), ilike(tourCustomers.whatsapp, s), ilike(tourCustomers.customerCode, s), ilike(tourCustomers.email, s)))
  }

  const where = and(...conds)
  const [rows, totalRows] = await Promise.all([
    db.select().from(tourCustomers).where(where).orderBy(desc(tourCustomers.createdAt)).limit(pageSize).offset(offset),
    db.select({ v: count() }).from(tourCustomers).where(where),
  ])
  return { data: rows, total: totalRows[0]?.v ?? 0, page, pageSize }
}

export async function getTourCustomer(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.select().from(tourCustomers).where(and(eq(tourCustomers.id, id), eq(tourCustomers.workspaceId, workspaceId), notDeleted(tourCustomers))).limit(1)
  return rows[0] ?? null
}

export async function createTourCustomer(db: DbLike, workspaceId: number, input: Record<string, unknown>) {
  const rows = await db.insert(tourCustomers).values({ ...input, workspaceId } as never).returning()
  return rows[0]
}

export async function updateTourCustomer(db: DbLike, id: number, workspaceId: number, patch: Record<string, unknown>) {
  const rows = await db.update(tourCustomers).set({ ...patch, updatedAt: new Date() } as never).where(and(eq(tourCustomers.id, id), eq(tourCustomers.workspaceId, workspaceId))).returning()
  return rows[0] ?? null
}

export async function softDeleteTourCustomer(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.update(tourCustomers).set({ deletedAt: new Date(), updatedAt: new Date() }).where(and(eq(tourCustomers.id, id), eq(tourCustomers.workspaceId, workspaceId))).returning({ id: tourCustomers.id })
  return rows[0] ?? null
}

// ─── Orders ─────────────────────────────────────────────────────────────────
export interface ListOrdersFilter {
  workspaceId: number
  search?: string
  status?: string
  orderType?: string
  customerId?: number
  page?: number
  pageSize?: number
}

export async function listTourOrders(db: DbLike, f: ListOrdersFilter) {
  const page = Math.max(1, f.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, f.pageSize ?? 20))
  const offset = (page - 1) * pageSize

  const conds: any[] = [eq(tourOrders.workspaceId, f.workspaceId), notDeleted(tourOrders)]
  if (f.status) conds.push(eq(tourOrders.status, f.status))
  if (f.orderType) conds.push(eq(tourOrders.orderType, f.orderType))
  if (f.customerId) conds.push(eq(tourOrders.customerId, f.customerId))
  if (f.search) {
    const s = `%${f.search}%`
    conds.push(or(ilike(tourOrders.orderCode, s), ilike(tourOrders.packageName, s), ilike(tourOrders.serviceSummary, s)))
  }

  const where = and(...conds)
  const [rows, totalRows] = await Promise.all([
    db.select().from(tourOrders).where(where).orderBy(desc(tourOrders.orderDate), desc(tourOrders.createdAt)).limit(pageSize).offset(offset),
    db.select({ v: count() }).from(tourOrders).where(where),
  ])
  return { data: rows, total: totalRows[0]?.v ?? 0, page, pageSize }
}

export async function getTourOrder(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.select().from(tourOrders).where(and(eq(tourOrders.id, id), eq(tourOrders.workspaceId, workspaceId), notDeleted(tourOrders))).limit(1)
  return rows[0] ?? null
}

export async function createTourOrder(db: DbLike, workspaceId: number, input: Record<string, unknown>) {
  const rows = await db.insert(tourOrders).values({ ...input, workspaceId } as never).returning()
  return rows[0]
}

export async function updateTourOrder(db: DbLike, id: number, workspaceId: number, patch: Record<string, unknown>) {
  const rows = await db.update(tourOrders).set({ ...patch, updatedAt: new Date() } as never).where(and(eq(tourOrders.id, id), eq(tourOrders.workspaceId, workspaceId))).returning()
  return rows[0] ?? null
}

export async function softDeleteTourOrder(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.update(tourOrders).set({ deletedAt: new Date(), updatedAt: new Date() }).where(and(eq(tourOrders.id, id), eq(tourOrders.workspaceId, workspaceId))).returning({ id: tourOrders.id })
  return rows[0] ?? null
}

// ─── Jamaah ─────────────────────────────────────────────────────────────────
export interface ListJamaahFilter {
  workspaceId: number
  search?: string
  orderId?: number
  visaStatus?: string
  siskopatuhStatus?: string
  page?: number
  pageSize?: number
}

export async function listTourJamaah(db: DbLike, f: ListJamaahFilter) {
  const page = Math.max(1, f.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, f.pageSize ?? 20))
  const offset = (page - 1) * pageSize

  const conds: any[] = [eq(tourJamaah.workspaceId, f.workspaceId), notDeleted(tourJamaah)]
  if (f.orderId) conds.push(eq(tourJamaah.orderId, f.orderId))
  if (f.visaStatus) conds.push(eq(tourJamaah.visaStatus, f.visaStatus))
  if (f.siskopatuhStatus) conds.push(eq(tourJamaah.siskopatuhStatus, f.siskopatuhStatus))
  if (f.search) {
    const s = `%${f.search}%`
    conds.push(or(ilike(tourJamaah.fullName, s), ilike(tourJamaah.jamaahCode, s), ilike(tourJamaah.passportNumber, s), ilike(tourJamaah.whatsapp, s)))
  }

  const where = and(...conds)
  const [rows, totalRows] = await Promise.all([
    db.select().from(tourJamaah).where(where).orderBy(desc(tourJamaah.createdAt)).limit(pageSize).offset(offset),
    db.select({ v: count() }).from(tourJamaah).where(where),
  ])
  return { data: rows, total: totalRows[0]?.v ?? 0, page, pageSize }
}

export async function getTourJamaah(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.select().from(tourJamaah).where(and(eq(tourJamaah.id, id), eq(tourJamaah.workspaceId, workspaceId), notDeleted(tourJamaah))).limit(1)
  return rows[0] ?? null
}

export async function createTourJamaah(db: DbLike, workspaceId: number, input: Record<string, unknown>) {
  const rows = await db.insert(tourJamaah).values({ ...input, workspaceId } as never).returning()
  return rows[0]
}

export async function updateTourJamaah(db: DbLike, id: number, workspaceId: number, patch: Record<string, unknown>) {
  const rows = await db.update(tourJamaah).set({ ...patch, updatedAt: new Date() } as never).where(and(eq(tourJamaah.id, id), eq(tourJamaah.workspaceId, workspaceId))).returning()
  return rows[0] ?? null
}

export async function softDeleteTourJamaah(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.update(tourJamaah).set({ deletedAt: new Date(), updatedAt: new Date() }).where(and(eq(tourJamaah.id, id), eq(tourJamaah.workspaceId, workspaceId))).returning({ id: tourJamaah.id })
  return rows[0] ?? null
}

// ─── Trips ──────────────────────────────────────────────────────────────────
export interface ListTripsFilter {
  workspaceId: number
  search?: string
  status?: string
  page?: number
  pageSize?: number
}

export async function listTourTrips(db: DbLike, f: ListTripsFilter) {
  const page = Math.max(1, f.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, f.pageSize ?? 20))
  const offset = (page - 1) * pageSize

  const conds: any[] = [eq(tourTrips.workspaceId, f.workspaceId), notDeleted(tourTrips)]
  if (f.status) conds.push(eq(tourTrips.status, f.status))
  if (f.search) {
    const s = `%${f.search}%`
    conds.push(or(ilike(tourTrips.name, s), ilike(tourTrips.tripCode, s), ilike(tourTrips.routeSummary, s)))
  }

  const where = and(...conds)
  const [rows, totalRows] = await Promise.all([
    db.select().from(tourTrips).where(where).orderBy(desc(tourTrips.departureDate)).limit(pageSize).offset(offset),
    db.select({ v: count() }).from(tourTrips).where(where),
  ])
  return { data: rows, total: totalRows[0]?.v ?? 0, page, pageSize }
}

export async function getTourTrip(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.select().from(tourTrips).where(and(eq(tourTrips.id, id), eq(tourTrips.workspaceId, workspaceId), notDeleted(tourTrips))).limit(1)
  return rows[0] ?? null
}

export async function createTourTrip(db: DbLike, workspaceId: number, input: Record<string, unknown>) {
  const rows = await db.insert(tourTrips).values({ ...input, workspaceId } as never).returning()
  return rows[0]
}

export async function updateTourTrip(db: DbLike, id: number, workspaceId: number, patch: Record<string, unknown>) {
  const rows = await db.update(tourTrips).set({ ...patch, updatedAt: new Date() } as never).where(and(eq(tourTrips.id, id), eq(tourTrips.workspaceId, workspaceId))).returning()
  return rows[0] ?? null
}

export async function softDeleteTourTrip(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.update(tourTrips).set({ deletedAt: new Date(), updatedAt: new Date() }).where(and(eq(tourTrips.id, id), eq(tourTrips.workspaceId, workspaceId))).returning({ id: tourTrips.id })
  return rows[0] ?? null
}

// ─── Trip Orders many-to-many ───────────────────────────────────────────────
export async function listTripOrders(db: DbLike, workspaceId: number, tripId?: number, orderId?: number) {
  const conds: any[] = [eq(tourTripOrders.workspaceId, workspaceId)]
  if (tripId) conds.push(eq(tourTripOrders.tripId, tripId))
  if (orderId) conds.push(eq(tourTripOrders.orderId, orderId))
  return db.select().from(tourTripOrders).where(and(...conds)).orderBy(desc(tourTripOrders.createdAt))
}

export async function assignOrderToTrip(db: DbLike, workspaceId: number, tripId: number, orderId: number) {
  // ensure both belong to same workspace and exist
  const trip = await getTourTrip(db, tripId, workspaceId)
  if (!trip) throw new Error('Trip not found')
  const order = await getTourOrder(db, orderId, workspaceId)
  if (!order) throw new Error('Order not found')
  const rows = await db.insert(tourTripOrders).values({ workspaceId, tripId, orderId }).onConflictDoNothing({ target: [tourTripOrders.tripId, tourTripOrders.orderId] }).returning()
  return rows[0] ?? null
}

export async function unassignOrderFromTrip(db: DbLike, workspaceId: number, tripId: number, orderId: number) {
  const rows = await db.delete(tourTripOrders).where(and(eq(tourTripOrders.workspaceId, workspaceId), eq(tourTripOrders.tripId, tripId), eq(tourTripOrders.orderId, orderId))).returning()
  return rows[0] ?? null
}

// ─── Vendors ────────────────────────────────────────────────────────────────
export interface ListVendorsFilter {
  workspaceId: number
  search?: string
  vendorType?: string
  status?: string
  page?: number
  pageSize?: number
}

export async function listTourVendors(db: DbLike, f: ListVendorsFilter) {
  const page = Math.max(1, f.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, f.pageSize ?? 20))
  const offset = (page - 1) * pageSize

  const conds: any[] = [eq(tourVendors.workspaceId, f.workspaceId), notDeleted(tourVendors)]
  if (f.vendorType) conds.push(eq(tourVendors.vendorType, f.vendorType))
  if (f.status) conds.push(eq(tourVendors.status, f.status))
  if (f.search) {
    const s = `%${f.search}%`
    conds.push(or(ilike(tourVendors.name, s), ilike(tourVendors.vendorCode, s), ilike(tourVendors.contactName, s)))
  }

  const where = and(...conds)
  const [rows, totalRows] = await Promise.all([
    db.select().from(tourVendors).where(where).orderBy(asc(tourVendors.name)).limit(pageSize).offset(offset),
    db.select({ v: count() }).from(tourVendors).where(where),
  ])
  return { data: rows, total: totalRows[0]?.v ?? 0, page, pageSize }
}

export async function getTourVendor(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.select().from(tourVendors).where(and(eq(tourVendors.id, id), eq(tourVendors.workspaceId, workspaceId), notDeleted(tourVendors))).limit(1)
  return rows[0] ?? null
}

export async function createTourVendor(db: DbLike, workspaceId: number, input: Record<string, unknown>) {
  const rows = await db.insert(tourVendors).values({ ...input, workspaceId } as never).returning()
  return rows[0]
}

export async function updateTourVendor(db: DbLike, id: number, workspaceId: number, patch: Record<string, unknown>) {
  const rows = await db.update(tourVendors).set({ ...patch, updatedAt: new Date() } as never).where(and(eq(tourVendors.id, id), eq(tourVendors.workspaceId, workspaceId))).returning()
  return rows[0] ?? null
}

export async function softDeleteTourVendor(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.update(tourVendors).set({ deletedAt: new Date(), updatedAt: new Date() }).where(and(eq(tourVendors.id, id), eq(tourVendors.workspaceId, workspaceId))).returning({ id: tourVendors.id })
  return rows[0] ?? null
}

// ─── Bookings ───────────────────────────────────────────────────────────────
export interface ListBookingsFilter {
  workspaceId: number
  search?: string
  status?: string
  bookingType?: string
  vendorId?: number
  tripId?: number
  orderId?: number
  page?: number
  pageSize?: number
}

export async function listTourBookings(db: DbLike, f: ListBookingsFilter) {
  const page = Math.max(1, f.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, f.pageSize ?? 20))
  const offset = (page - 1) * pageSize

  const conds: any[] = [eq(tourBookings.workspaceId, f.workspaceId), notDeleted(tourBookings)]
  if (f.status) conds.push(eq(tourBookings.status, f.status))
  if (f.bookingType) conds.push(eq(tourBookings.bookingType, f.bookingType))
  if (f.vendorId) conds.push(eq(tourBookings.vendorId, f.vendorId))
  if (f.tripId) conds.push(eq(tourBookings.tripId, f.tripId))
  if (f.orderId) conds.push(eq(tourBookings.orderId, f.orderId))
  if (f.search) {
    const s = `%${f.search}%`
    conds.push(or(ilike(tourBookings.bookingCode, s), ilike(tourBookings.description, s)))
  }

  const where = and(...conds)
  const [rows, totalRows] = await Promise.all([
    db.select().from(tourBookings).where(where).orderBy(desc(tourBookings.bookingDate), desc(tourBookings.createdAt)).limit(pageSize).offset(offset),
    db.select({ v: count() }).from(tourBookings).where(where),
  ])
  return { data: rows, total: totalRows[0]?.v ?? 0, page, pageSize }
}

export async function getTourBooking(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.select().from(tourBookings).where(and(eq(tourBookings.id, id), eq(tourBookings.workspaceId, workspaceId), notDeleted(tourBookings))).limit(1)
  return rows[0] ?? null
}

export async function createTourBooking(db: DbLike, workspaceId: number, input: Record<string, unknown>) {
  const rows = await db.insert(tourBookings).values({ ...input, workspaceId } as never).returning()
  return rows[0]
}

export async function updateTourBooking(db: DbLike, id: number, workspaceId: number, patch: Record<string, unknown>) {
  const rows = await db.update(tourBookings).set({ ...patch, updatedAt: new Date() } as never).where(and(eq(tourBookings.id, id), eq(tourBookings.workspaceId, workspaceId))).returning()
  return rows[0] ?? null
}

export async function softDeleteTourBooking(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.update(tourBookings).set({ deletedAt: new Date(), updatedAt: new Date() }).where(and(eq(tourBookings.id, id), eq(tourBookings.workspaceId, workspaceId))).returning({ id: tourBookings.id })
  return rows[0] ?? null
}

// ─── Dashboard summary for tour ops ─────────────────────────────────────────
export async function getTourOpsSummary(db: DbLike, workspaceId: number) {
  const [customers, orders, jamaah, trips, bookings, vendors] = await Promise.all([
    db.select({ v: count() }).from(tourCustomers).where(and(eq(tourCustomers.workspaceId, workspaceId), notDeleted(tourCustomers))),
    db.select({ v: count() }).from(tourOrders).where(and(eq(tourOrders.workspaceId, workspaceId), notDeleted(tourOrders))),
    db.select({ v: count() }).from(tourJamaah).where(and(eq(tourJamaah.workspaceId, workspaceId), notDeleted(tourJamaah))),
    db.select({ v: count() }).from(tourTrips).where(and(eq(tourTrips.workspaceId, workspaceId), notDeleted(tourTrips))),
    db.select({ v: count() }).from(tourBookings).where(and(eq(tourBookings.workspaceId, workspaceId), notDeleted(tourBookings))),
    db.select({ v: count() }).from(tourVendors).where(and(eq(tourVendors.workspaceId, workspaceId), notDeleted(tourVendors))),
  ])

  const activeOrders = await db.select({ v: count() }).from(tourOrders).where(and(eq(tourOrders.workspaceId, workspaceId), notDeleted(tourOrders), or(eq(tourOrders.status, 'CONFIRMED'), eq(tourOrders.status, 'IN_PROGRESS'))))
  const upcomingTrips = await db.select({ v: count() }).from(tourTrips).where(and(eq(tourTrips.workspaceId, workspaceId), notDeleted(tourTrips), eq(tourTrips.status, 'CONFIRMED')))
  const confirmedBookings = await db.select({ v: count() }).from(tourBookings).where(and(eq(tourBookings.workspaceId, workspaceId), notDeleted(tourBookings), eq(tourBookings.status, 'CONFIRMED')))
  const totalPax = await db.select({ v: sql<number>`coalesce(sum(${tourOrders.paxCount}),0)` }).from(tourOrders).where(and(eq(tourOrders.workspaceId, workspaceId), notDeleted(tourOrders)))

  return {
    totalCustomers: customers[0]?.v ?? 0,
    totalOrders: orders[0]?.v ?? 0,
    activeOrders: activeOrders[0]?.v ?? 0,
    totalPax: Number(totalPax[0]?.v ?? 0),
    totalJamaah: jamaah[0]?.v ?? 0,
    totalTrips: trips[0]?.v ?? 0,
    upcomingTrips: upcomingTrips[0]?.v ?? 0,
    totalBookings: bookings[0]?.v ?? 0,
    confirmedBookings: confirmedBookings[0]?.v ?? 0,
    totalVendors: vendors[0]?.v ?? 0,
  }
}
