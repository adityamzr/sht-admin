import { and, asc, desc, eq, gte, ilike, isNull, ne, or, sql, count, inArray } from 'drizzle-orm'
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
  if (!rows[0]) {
    throw new Error('Tour workspace not found — configuration error, refusing to fallback')
  }
  return rows[0].id
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
  includeArchived?: boolean
}

export async function listTourCustomers(db: DbLike, f: ListCustomersFilter) {
  const page = Math.max(1, f.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, f.pageSize ?? 20))
  const offset = (page - 1) * pageSize

  const conds: any[] = [eq(tourCustomers.workspaceId, f.workspaceId)]
  if (!f.includeArchived) conds.push(notDeleted(tourCustomers))
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

export async function getTourCustomerIncludingDeleted(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.select().from(tourCustomers).where(and(eq(tourCustomers.id, id), eq(tourCustomers.workspaceId, workspaceId))).limit(1)
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

export async function listTourOrdersWithCustomer(db: DbLike, f: ListOrdersFilter) {
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
    db.select({
      order: tourOrders,
      customer: tourCustomers,
    }).from(tourOrders)
      .leftJoin(tourCustomers, and(eq(tourOrders.customerId, tourCustomers.id), eq(tourCustomers.workspaceId, f.workspaceId)))
      .where(where)
      .orderBy(desc(tourOrders.orderDate), desc(tourOrders.createdAt))
      .limit(pageSize).offset(offset),
    db.select({ v: count() }).from(tourOrders).where(where),
  ])

  const data = rows.map(r => ({
    ...r.order,
    customer: r.customer ? { id: r.customer.id, customerCode: r.customer.customerCode, name: r.customer.name, deletedAt: r.customer.deletedAt } : null,
  }))

  return { data, total: totalRows[0]?.v ?? 0, page, pageSize }
}

export async function getTourOrder(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.select().from(tourOrders).where(and(eq(tourOrders.id, id), eq(tourOrders.workspaceId, workspaceId), notDeleted(tourOrders))).limit(1)
  return rows[0] ?? null
}

export async function getTourOrderIncludingDeleted(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.select().from(tourOrders).where(and(eq(tourOrders.id, id), eq(tourOrders.workspaceId, workspaceId))).limit(1)
  return rows[0] ?? null
}

export async function createTourOrder(db: DbLike, workspaceId: number, input: Record<string, unknown>) {
  // Validate customer belongs to same workspace and is active
  const customerId = (input as any).customerId
  if (customerId) {
    const cust = await getTourCustomer(db, Number(customerId), workspaceId)
    if (!cust) throw new Error('Customer not found or archived')
  }
  // Validate lead/estimation existence if provided
  const leadId = (input as any).leadId
  if (leadId) {
    const leadRows = await db.select({ id: leads.id }).from(leads).where(eq(leads.id, Number(leadId))).limit(1)
    if (!leadRows[0]) throw new Error('Lead not found')
  }
  const estimationId = (input as any).estimationId
  if (estimationId) {
    const estRows = await db.select({ id: estimations.id }).from(estimations).where(eq(estimations.id, Number(estimationId))).limit(1)
    if (!estRows[0]) throw new Error('Estimation not found')
  }

  const rows = await db.insert(tourOrders).values({ ...input, workspaceId } as never).returning()
  return rows[0]
}

export async function updateTourOrder(db: DbLike, id: number, workspaceId: number, patch: Record<string, unknown>) {
  if ((patch as any).customerId) {
    const cust = await getTourCustomer(db, Number((patch as any).customerId), workspaceId)
    if (!cust) throw new Error('Customer not found or archived')
  }
  if ((patch as any).leadId) {
    const leadRows = await db.select({ id: leads.id }).from(leads).where(eq(leads.id, Number((patch as any).leadId))).limit(1)
    if (!leadRows[0]) throw new Error('Lead not found')
  }
  if ((patch as any).estimationId) {
    const estRows = await db.select({ id: estimations.id }).from(estimations).where(eq(estimations.id, Number((patch as any).estimationId))).limit(1)
    if (!estRows[0]) throw new Error('Estimation not found')
  }

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

export async function listTourJamaahEnriched(db: DbLike, f: ListJamaahFilter) {
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
    db.select({
      jamaah: tourJamaah,
      order: tourOrders,
      customer: tourCustomers,
    }).from(tourJamaah)
      .leftJoin(tourOrders, and(eq(tourJamaah.orderId, tourOrders.id), eq(tourOrders.workspaceId, f.workspaceId)))
      .leftJoin(tourCustomers, and(eq(tourOrders.customerId, tourCustomers.id), eq(tourCustomers.workspaceId, f.workspaceId)))
      .where(where).orderBy(desc(tourJamaah.createdAt)).limit(pageSize).offset(offset),
    db.select({ v: count() }).from(tourJamaah).where(where),
  ])

  const data = rows.map(r => ({
    ...r.jamaah,
    order: r.order ? { id: r.order.id, orderCode: r.order.orderCode, paxCount: r.order.paxCount, status: r.order.status, customerId: r.order.customerId } : null,
    customer: r.customer ? { id: r.customer.id, customerCode: r.customer.customerCode, name: r.customer.name, deletedAt: r.customer.deletedAt } : null,
  }))

  return { data, total: totalRows[0]?.v ?? 0, page, pageSize }
}

export async function getTourJamaah(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.select().from(tourJamaah).where(and(eq(tourJamaah.id, id), eq(tourJamaah.workspaceId, workspaceId), notDeleted(tourJamaah))).limit(1)
  return rows[0] ?? null
}

export async function getTourJamaahEnriched(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.select({
    jamaah: tourJamaah,
    order: tourOrders,
    customer: tourCustomers,
  }).from(tourJamaah)
    .leftJoin(tourOrders, and(eq(tourJamaah.orderId, tourOrders.id), eq(tourOrders.workspaceId, workspaceId)))
    .leftJoin(tourCustomers, and(eq(tourOrders.customerId, tourCustomers.id), eq(tourCustomers.workspaceId, workspaceId)))
    .where(and(eq(tourJamaah.id, id), eq(tourJamaah.workspaceId, workspaceId), notDeleted(tourJamaah))).limit(1)

  if (!rows[0]) return null
  const r = rows[0]
  return {
    ...r.jamaah,
    order: r.order ? { id: r.order.id, orderCode: r.order.orderCode, paxCount: r.order.paxCount, status: r.order.status, customerId: r.order.customerId } : null,
    customer: r.customer ? { id: r.customer.id, customerCode: r.customer.customerCode, name: r.customer.name, deletedAt: r.customer.deletedAt } : null,
  }
}

export async function createTourJamaah(db: DbLike, workspaceId: number, input: Record<string, unknown>) {
  const orderId = Number((input as any).orderId)
  const order = await getTourOrder(db, orderId, workspaceId)
  if (!order) throw new Error('Order not found or not in same workspace')
  const rows = await db.insert(tourJamaah).values({ ...input, workspaceId } as never).returning()
  return rows[0]
}

export async function updateTourJamaah(db: DbLike, id: number, workspaceId: number, patch: Record<string, unknown>) {
  if ((patch as any).orderId) {
    const order = await getTourOrder(db, Number((patch as any).orderId), workspaceId)
    if (!order) throw new Error('Order not found or not in same workspace')
  }
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

// Derived total pax: sum paxCount from linked orders excluding CANCELLED
export async function getTripDerivedPax(db: DbLike, workspaceId: number, tripId: number): Promise<number> {
  const result = await db
    .select({ v: sql<number>`coalesce(sum(${tourOrders.paxCount}),0)` })
    .from(tourTripOrders)
    .innerJoin(tourOrders, and(eq(tourTripOrders.orderId, tourOrders.id), eq(tourOrders.workspaceId, workspaceId), isNull(tourOrders.deletedAt), ne(tourOrders.status, 'CANCELLED')))
    .where(and(eq(tourTripOrders.workspaceId, workspaceId), eq(tourTripOrders.tripId, tripId)))

  return Number(result[0]?.v ?? 0)
}

export async function getTripWithDerived(db: DbLike, workspaceId: number, tripId: number) {
  const trip = await getTourTrip(db, tripId, workspaceId)
  if (!trip) return null
  const totalPax = await getTripDerivedPax(db, workspaceId, tripId)
  return { ...trip, totalPax }
}

// ─── Trip Orders many-to-many ───────────────────────────────────────────────
export async function listTripOrders(db: DbLike, workspaceId: number, tripId?: number, orderId?: number) {
  const conds: any[] = [eq(tourTripOrders.workspaceId, workspaceId)]
  if (tripId) conds.push(eq(tourTripOrders.tripId, tripId))
  if (orderId) conds.push(eq(tourTripOrders.orderId, orderId))
  return db.select().from(tourTripOrders).where(and(...conds)).orderBy(desc(tourTripOrders.createdAt))
}

export async function listTripOrdersEnriched(db: DbLike, workspaceId: number, tripId?: number, orderId?: number) {
  const conds: any[] = [eq(tourTripOrders.workspaceId, workspaceId)]
  if (tripId) conds.push(eq(tourTripOrders.tripId, tripId))
  if (orderId) conds.push(eq(tourTripOrders.orderId, orderId))

  const rows = await db
    .select({
      link: tourTripOrders,
      order: tourOrders,
      customer: tourCustomers,
    })
    .from(tourTripOrders)
    .leftJoin(tourOrders, and(eq(tourTripOrders.orderId, tourOrders.id), eq(tourOrders.workspaceId, workspaceId)))
    .leftJoin(tourCustomers, and(eq(tourOrders.customerId, tourCustomers.id), eq(tourCustomers.workspaceId, workspaceId)))
    .where(and(...conds))
    .orderBy(desc(tourTripOrders.createdAt))

  return rows.map(r => ({
    id: r.link.id,
    workspaceId: r.link.workspaceId,
    tripId: r.link.tripId,
    orderId: r.link.orderId,
    createdAt: r.link.createdAt,
    order: r.order ? { id: r.order.id, orderCode: r.order.orderCode, paxCount: r.order.paxCount, status: r.order.status, packageName: r.order.packageName } : null,
    customer: r.customer ? { id: r.customer.id, customerCode: r.customer.customerCode, name: r.customer.name, deletedAt: r.customer.deletedAt } : null,
  }))
}

export async function assignOrderToTrip(db: DbLike, workspaceId: number, tripId: number, orderId: number) {
  // ensure both belong to same workspace and exist and not deleted
  const trip = await getTourTrip(db, tripId, workspaceId)
  if (!trip) throw new Error('Trip not found')
  const order = await getTourOrder(db, orderId, workspaceId)
  if (!order) throw new Error('Order not found or not in same workspace')
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
  includeArchived?: boolean
}

export async function listTourVendors(db: DbLike, f: ListVendorsFilter) {
  const page = Math.max(1, f.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, f.pageSize ?? 20))
  const offset = (page - 1) * pageSize

  const conds: any[] = [eq(tourVendors.workspaceId, f.workspaceId)]
  if (!f.includeArchived) conds.push(notDeleted(tourVendors))
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

export async function getTourVendorIncludingDeleted(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.select().from(tourVendors).where(and(eq(tourVendors.id, id), eq(tourVendors.workspaceId, workspaceId))).limit(1)
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

export async function listTourBookingsEnriched(db: DbLike, f: ListBookingsFilter) {
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
    db.select({
      booking: tourBookings,
      vendor: tourVendors,
      trip: tourTrips,
      order: tourOrders,
      customer: tourCustomers,
    }).from(tourBookings)
      .leftJoin(tourVendors, and(eq(tourBookings.vendorId, tourVendors.id), eq(tourVendors.workspaceId, f.workspaceId)))
      .leftJoin(tourTrips, and(eq(tourBookings.tripId, tourTrips.id), eq(tourTrips.workspaceId, f.workspaceId)))
      .leftJoin(tourOrders, and(eq(tourBookings.orderId, tourOrders.id), eq(tourOrders.workspaceId, f.workspaceId)))
      .leftJoin(tourCustomers, and(eq(tourOrders.customerId, tourCustomers.id), eq(tourCustomers.workspaceId, f.workspaceId)))
      .where(where)
      .orderBy(desc(tourBookings.bookingDate), desc(tourBookings.createdAt))
      .limit(pageSize).offset(offset),
    db.select({ v: count() }).from(tourBookings).where(where),
  ])

  const data = rows.map(r => ({
    ...r.booking,
    vendor: r.vendor ? { id: r.vendor.id, vendorCode: r.vendor.vendorCode, name: r.vendor.name, deletedAt: r.vendor.deletedAt } : null,
    trip: r.trip ? { id: r.trip.id, tripCode: r.trip.tripCode, name: r.trip.name } : null,
    order: r.order ? { id: r.order.id, orderCode: r.order.orderCode, paxCount: r.order.paxCount } : null,
    customer: r.customer ? { id: r.customer.id, customerCode: r.customer.customerCode, name: r.customer.name, deletedAt: r.customer.deletedAt } : null,
  }))

  return { data, total: totalRows[0]?.v ?? 0, page, pageSize }
}

export async function getTourBooking(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.select().from(tourBookings).where(and(eq(tourBookings.id, id), eq(tourBookings.workspaceId, workspaceId), notDeleted(tourBookings))).limit(1)
  return rows[0] ?? null
}

export async function getTourBookingEnriched(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.select({
    booking: tourBookings,
    vendor: tourVendors,
    trip: tourTrips,
    order: tourOrders,
    customer: tourCustomers,
  }).from(tourBookings)
    .leftJoin(tourVendors, and(eq(tourBookings.vendorId, tourVendors.id), eq(tourVendors.workspaceId, workspaceId)))
    .leftJoin(tourTrips, and(eq(tourBookings.tripId, tourTrips.id), eq(tourTrips.workspaceId, workspaceId)))
    .leftJoin(tourOrders, and(eq(tourBookings.orderId, tourOrders.id), eq(tourOrders.workspaceId, workspaceId)))
    .leftJoin(tourCustomers, and(eq(tourOrders.customerId, tourCustomers.id), eq(tourCustomers.workspaceId, workspaceId)))
    .where(and(eq(tourBookings.id, id), eq(tourBookings.workspaceId, workspaceId), notDeleted(tourBookings)))
    .limit(1)

  if (!rows[0]) return null
  const r = rows[0]
  return {
    ...r.booking,
    vendor: r.vendor ? { id: r.vendor.id, vendorCode: r.vendor.vendorCode, name: r.vendor.name, deletedAt: r.vendor.deletedAt } : null,
    trip: r.trip ? { id: r.trip.id, tripCode: r.trip.tripCode, name: r.trip.name } : null,
    order: r.order ? { id: r.order.id, orderCode: r.order.orderCode, paxCount: r.order.paxCount, customerId: r.order.customerId } : null,
    customer: r.customer ? { id: r.customer.id, customerCode: r.customer.customerCode, name: r.customer.name, deletedAt: r.customer.deletedAt } : null,
  }
}

export async function createTourBooking(db: DbLike, workspaceId: number, input: Record<string, unknown>) {
  const vendorId = Number((input as any).vendorId)
  const vendor = await getTourVendor(db, vendorId, workspaceId)
  if (!vendor) throw new Error('Vendor not found or archived')

  const tripId = (input as any).tripId
  if (tripId) {
    const trip = await getTourTrip(db, Number(tripId), workspaceId)
    if (!trip) throw new Error('Trip not found or not in same workspace')
  }
  const orderId = (input as any).orderId
  if (orderId) {
    const order = await getTourOrder(db, Number(orderId), workspaceId)
    if (!order) throw new Error('Order not found or not in same workspace')
  }

  const rows = await db.insert(tourBookings).values({ ...input, workspaceId } as never).returning()
  return rows[0]
}

export async function updateTourBooking(db: DbLike, id: number, workspaceId: number, patch: Record<string, unknown>) {
  if ((patch as any).vendorId) {
    const vendor = await getTourVendor(db, Number((patch as any).vendorId), workspaceId)
    if (!vendor) throw new Error('Vendor not found or archived')
  }
  if ((patch as any).tripId) {
    const trip = await getTourTrip(db, Number((patch as any).tripId), workspaceId)
    if (!trip) throw new Error('Trip not found or not in same workspace')
  }
  if ((patch as any).orderId) {
    const order = await getTourOrder(db, Number((patch as any).orderId), workspaceId)
    if (!order) throw new Error('Order not found or not in same workspace')
  }

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
  const today = new Date().toISOString().slice(0, 10)
  const upcomingTrips = await db.select({ v: count() }).from(tourTrips).where(and(eq(tourTrips.workspaceId, workspaceId), notDeleted(tourTrips), gte(tourTrips.departureDate, today as any), or(eq(tourTrips.status, 'PLANNED'), eq(tourTrips.status, 'CONFIRMED'))))
  const confirmedBookings = await db.select({ v: count() }).from(tourBookings).where(and(eq(tourBookings.workspaceId, workspaceId), notDeleted(tourBookings), eq(tourBookings.status, 'CONFIRMED')))
  const totalPax = await db.select({ v: sql<number>`coalesce(sum(${tourOrders.paxCount}),0)` }).from(tourOrders).where(and(eq(tourOrders.workspaceId, workspaceId), notDeleted(tourOrders), ne(tourOrders.status, 'CANCELLED')))

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
