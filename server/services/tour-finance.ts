import { and, asc, desc, eq, gte, ilike, isNull, lte, ne, or, sql, count, inArray } from 'drizzle-orm'
import {
  tourCustomers,
  tourOrders,
  tourInvoices,
  tourPayments,
  tourExpenses,
  tourTrips,
  tourVendors,
  tourBookings,
  tourTripOrders,
  workspaces,
} from '../db/schema'
import type { DbLike } from '../db'

function badRequest(msg: string): never {
  throw createError({ statusCode: 400, statusMessage: msg })
}

function notDeleted(table: any) {
  return isNull(table.deletedAt)
}

function toIsoDateString(d: any): string | null {
  if (!d) return null
  if (typeof d === 'string') return d.slice(0, 10)
  if (d instanceof Date) return d.toISOString().slice(0, 10)
  return String(d).slice(0, 10)
}

// Workspace helper
export async function getTourWorkspaceIdFinance(db: DbLike): Promise<number> {
  const rows = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.key, 'tour')).limit(1)
  if (!rows[0]) throw new Error('Tour workspace not found')
  return rows[0].id
}

// ─── Invoices ───────────────────────────────────────────────────────────────
export interface ListInvoicesFilter {
  workspaceId: number
  search?: string
  state?: string
  orderId?: number
  page?: number
  pageSize?: number
}

export async function listTourInvoices(db: DbLike, f: ListInvoicesFilter) {
  const page = Math.max(1, f.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, f.pageSize ?? 20))
  const offset = (page - 1) * pageSize
  const conds: any[] = [eq(tourInvoices.workspaceId, f.workspaceId), notDeleted(tourInvoices)]
  if (f.state) conds.push(eq(tourInvoices.state, f.state))
  if (f.orderId) conds.push(eq(tourInvoices.orderId, f.orderId))
  if (f.search) {
    const s = `%${f.search}%`
    conds.push(or(ilike(tourInvoices.invoiceCode, s), ilike(tourInvoices.description, s)))
  }
  const where = and(...conds)
  const [rows, totalRows] = await Promise.all([
    db.select().from(tourInvoices).where(where).orderBy(desc(tourInvoices.issueDate), desc(tourInvoices.createdAt)).limit(pageSize).offset(offset),
    db.select({ v: count() }).from(tourInvoices).where(where),
  ])
  return { data: rows, total: totalRows[0]?.v ?? 0, page, pageSize }
}

export async function listTourInvoicesEnriched(db: DbLike, f: ListInvoicesFilter) {
  const page = Math.max(1, f.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, f.pageSize ?? 20))
  const offset = (page - 1) * pageSize
  const conds: any[] = [eq(tourInvoices.workspaceId, f.workspaceId), notDeleted(tourInvoices)]
  if (f.state) conds.push(eq(tourInvoices.state, f.state))
  if (f.orderId) conds.push(eq(tourInvoices.orderId, f.orderId))
  if (f.search) {
    const s = `%${f.search}%`
    conds.push(or(ilike(tourInvoices.invoiceCode, s), ilike(tourInvoices.description, s)))
  }
  const where = and(...conds)
  const [rows, totalRows] = await Promise.all([
    db.select({
      invoice: tourInvoices,
      order: tourOrders,
      customer: tourCustomers,
    }).from(tourInvoices)
      .leftJoin(tourOrders, and(eq(tourInvoices.orderId, tourOrders.id), eq(tourOrders.workspaceId, f.workspaceId)))
      .leftJoin(tourCustomers, and(eq(tourOrders.customerId, tourCustomers.id), eq(tourCustomers.workspaceId, f.workspaceId)))
      .where(where).orderBy(desc(tourInvoices.issueDate), desc(tourInvoices.createdAt)).limit(pageSize).offset(offset),
    db.select({ v: count() }).from(tourInvoices).where(where),
  ])

  // For each invoice, compute paid/outstanding
  const invoiceIds = rows.map(r => r.invoice.id)
  let paymentsMap: Record<number, { totalPaid: number; count: number }> = {}
  if (invoiceIds.length) {
    const payments = await db.select({
      invoiceId: tourPayments.invoiceId,
      total: sql<number>`coalesce(sum(CASE WHEN ${tourPayments.status} = 'VERIFIED' THEN ${tourPayments.amountIdr} ELSE 0 END),0)`,
      cnt: count(),
    }).from(tourPayments).where(and(eq(tourPayments.workspaceId, f.workspaceId), inArray(tourPayments.invoiceId, invoiceIds), notDeleted(tourPayments))).groupBy(tourPayments.invoiceId)
    for (const p of payments) {
      paymentsMap[p.invoiceId] = { totalPaid: Number(p.total ?? 0), count: Number(p.cnt ?? 0) }
    }
  }

  const data = rows.map(r => {
    const totalPaid = paymentsMap[r.invoice.id]?.totalPaid ?? 0
    const amount = Number(r.invoice.amountIdr ?? 0)
    const outstanding = Math.max(amount - totalPaid, 0)
    let paymentStatus: string = 'UNPAID'
    if (r.invoice.state === 'CANCELLED') paymentStatus = 'CANCELLED'
    else if (outstanding === 0 && totalPaid > 0) paymentStatus = 'PAID'
    else if (totalPaid > 0 && outstanding > 0) paymentStatus = 'PARTIAL'
    else {
      // check overdue
      if (r.invoice.dueDate) {
        const today = new Date().toISOString().slice(0, 10)
        const due = toIsoDateString(r.invoice.dueDate)
        if (due && due < today && outstanding > 0) paymentStatus = 'OVERDUE'
        else paymentStatus = 'UNPAID'
      } else {
        paymentStatus = 'UNPAID'
      }
    }

    return {
      ...r.invoice,
      order: r.order ? { id: r.order.id, orderCode: r.order.orderCode, paxCount: r.order.paxCount, sellingPriceIdr: r.order.sellingPriceIdr, status: r.order.status } : null,
      customer: r.customer ? { id: r.customer.id, customerCode: r.customer.customerCode, name: r.customer.name, deletedAt: r.customer.deletedAt } : null,
      totalPaid,
      outstanding,
      paymentStatus,
    }
  })

  return { data, total: totalRows[0]?.v ?? 0, page, pageSize }
}

export async function getTourInvoice(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.select().from(tourInvoices).where(and(eq(tourInvoices.id, id), eq(tourInvoices.workspaceId, workspaceId), notDeleted(tourInvoices))).limit(1)
  return rows[0] ?? null
}

export async function getTourInvoiceEnriched(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.select({
    invoice: tourInvoices,
    order: tourOrders,
    customer: tourCustomers,
  }).from(tourInvoices)
    .leftJoin(tourOrders, and(eq(tourInvoices.orderId, tourOrders.id), eq(tourOrders.workspaceId, workspaceId)))
    .leftJoin(tourCustomers, and(eq(tourOrders.customerId, tourCustomers.id), eq(tourCustomers.workspaceId, workspaceId)))
    .where(and(eq(tourInvoices.id, id), eq(tourInvoices.workspaceId, workspaceId), notDeleted(tourInvoices))).limit(1)
  if (!rows[0]) return null
  const r = rows[0]

  // compute payments
  const payments = await db.select({
    total: sql<number>`coalesce(sum(CASE WHEN ${tourPayments.status} = 'VERIFIED' THEN ${tourPayments.amountIdr} ELSE 0 END),0)`,
  }).from(tourPayments).where(and(eq(tourPayments.workspaceId, workspaceId), eq(tourPayments.invoiceId, id), notDeleted(tourPayments)))

  const totalPaid = Number(payments[0]?.total ?? 0)
  const amount = Number(r.invoice.amountIdr ?? 0)
  const outstanding = Math.max(amount - totalPaid, 0)

  let paymentStatus = 'UNPAID'
  if (r.invoice.state === 'CANCELLED') paymentStatus = 'CANCELLED'
  else if (outstanding === 0 && totalPaid > 0) paymentStatus = 'PAID'
  else if (totalPaid > 0 && outstanding > 0) paymentStatus = 'PARTIAL'
  else {
    if (r.invoice.dueDate) {
      const today = new Date().toISOString().slice(0, 10)
      const due = toIsoDateString(r.invoice.dueDate)
      if (due && due < today && outstanding > 0) paymentStatus = 'OVERDUE'
    }
  }

  return {
    ...r.invoice,
    order: r.order ? { id: r.order.id, orderCode: r.order.orderCode, paxCount: r.order.paxCount, sellingPriceIdr: r.order.sellingPriceIdr, status: r.order.status, customerId: r.order.customerId } : null,
    customer: r.customer ? { id: r.customer.id, customerCode: r.customer.customerCode, name: r.customer.name, deletedAt: r.customer.deletedAt } : null,
    totalPaid,
    outstanding,
    paymentStatus,
  }
}

export async function createTourInvoice(db: DbLike, workspaceId: number, input: Record<string, unknown>, createdBy?: number) {
  const orderId = Number((input as any).orderId)
  const orderRows = await db.select().from(tourOrders).where(and(eq(tourOrders.id, orderId), eq(tourOrders.workspaceId, workspaceId), notDeleted(tourOrders))).limit(1)
  if (!orderRows[0]) badRequest('Order tidak ditemukan atau bukan milik workspace ini')
  // dueDate validation handled by zod, but double-check
  const issueDate = (input as any).issueDate
  const dueDate = (input as any).dueDate
  if (issueDate && dueDate) {
    const issue = new Date(issueDate)
    const due = new Date(dueDate)
    if (due.getTime() < issue.getTime()) badRequest('dueDate tidak boleh sebelum issueDate')
  }
  const rows = await db.insert(tourInvoices).values({ ...input, workspaceId, createdBy } as never).returning()
  return rows[0]
}

export async function updateTourInvoice(db: DbLike, id: number, workspaceId: number, patch: Record<string, unknown>, updatedBy?: number) {
  const existing = await getTourInvoice(db, id, workspaceId)
  if (!existing) return null
  if (existing.state === 'CANCELLED' && (patch as any).state !== 'CANCELLED') {
    // allow staying cancelled but not un-cancelling? For V1 allow but warn – we allow
  }
  if ((patch as any).orderId) {
    const orderRows = await db.select().from(tourOrders).where(and(eq(tourOrders.id, Number((patch as any).orderId)), eq(tourOrders.workspaceId, workspaceId), notDeleted(tourOrders))).limit(1)
    if (!orderRows[0]) badRequest('Order tidak ditemukan')
  }
  const rows = await db.update(tourInvoices).set({ ...patch, updatedBy, updatedAt: new Date() } as never).where(and(eq(tourInvoices.id, id), eq(tourInvoices.workspaceId, workspaceId))).returning()
  return rows[0] ?? null
}

export async function softDeleteTourInvoice(db: DbLike, id: number, workspaceId: number) {
  // Only allow delete if DRAFT, otherwise prefer CANCEL
  const existing = await getTourInvoice(db, id, workspaceId)
  if (!existing) return null
  if (existing.state === 'ISSUED') badRequest('Invoice ISSUED tidak boleh dihapus, gunakan CANCEL')
  const rows = await db.update(tourInvoices).set({ deletedAt: new Date(), updatedAt: new Date() } as never).where(and(eq(tourInvoices.id, id), eq(tourInvoices.workspaceId, workspaceId))).returning({ id: tourInvoices.id })
  return rows[0] ?? null
}

// ─── Payments ───────────────────────────────────────────────────────────────
export interface ListPaymentsFilter {
  workspaceId: number
  search?: string
  status?: string
  method?: string
  invoiceId?: number
  orderId?: number
  page?: number
  pageSize?: number
}

export async function listTourPayments(db: DbLike, f: ListPaymentsFilter) {
  const page = Math.max(1, f.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, f.pageSize ?? 20))
  const offset = (page - 1) * pageSize
  const conds: any[] = [eq(tourPayments.workspaceId, f.workspaceId), notDeleted(tourPayments)]
  if (f.status) conds.push(eq(tourPayments.status, f.status))
  if (f.method) conds.push(eq(tourPayments.method, f.method))
  if (f.invoiceId) conds.push(eq(tourPayments.invoiceId, f.invoiceId))
  if (f.orderId) conds.push(eq(tourPayments.orderId, f.orderId))
  if (f.search) {
    const s = `%${f.search}%`
    conds.push(or(ilike(tourPayments.paymentCode, s), ilike(tourPayments.referenceNumber, s)))
  }
  const where = and(...conds)
  const [rows, totalRows] = await Promise.all([
    db.select().from(tourPayments).where(where).orderBy(desc(tourPayments.paymentDate), desc(tourPayments.createdAt)).limit(pageSize).offset(offset),
    db.select({ v: count() }).from(tourPayments).where(where),
  ])
  return { data: rows, total: totalRows[0]?.v ?? 0, page, pageSize }
}

export async function listTourPaymentsEnriched(db: DbLike, f: ListPaymentsFilter) {
  const page = Math.max(1, f.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, f.pageSize ?? 20))
  const offset = (page - 1) * pageSize
  const conds: any[] = [eq(tourPayments.workspaceId, f.workspaceId), notDeleted(tourPayments)]
  if (f.status) conds.push(eq(tourPayments.status, f.status))
  if (f.method) conds.push(eq(tourPayments.method, f.method))
  if (f.invoiceId) conds.push(eq(tourPayments.invoiceId, f.invoiceId))
  if (f.orderId) conds.push(eq(tourPayments.orderId, f.orderId))
  if (f.search) {
    const s = `%${f.search}%`
    conds.push(or(ilike(tourPayments.paymentCode, s), ilike(tourPayments.referenceNumber, s)))
  }
  const where = and(...conds)
  const [rows, totalRows] = await Promise.all([
    db.select({
      payment: tourPayments,
      invoice: tourInvoices,
      order: tourOrders,
      customer: tourCustomers,
    }).from(tourPayments)
      .leftJoin(tourInvoices, and(eq(tourPayments.invoiceId, tourInvoices.id), eq(tourInvoices.workspaceId, f.workspaceId)))
      .leftJoin(tourOrders, and(eq(tourPayments.orderId, tourOrders.id), eq(tourOrders.workspaceId, f.workspaceId)))
      .leftJoin(tourCustomers, and(eq(tourOrders.customerId, tourCustomers.id), eq(tourCustomers.workspaceId, f.workspaceId)))
      .where(where).orderBy(desc(tourPayments.paymentDate), desc(tourPayments.createdAt)).limit(pageSize).offset(offset),
    db.select({ v: count() }).from(tourPayments).where(where),
  ])
  const data = rows.map(r => ({
    ...r.payment,
    invoice: r.invoice ? { id: r.invoice.id, invoiceCode: r.invoice.invoiceCode, amountIdr: r.invoice.amountIdr, state: r.invoice.state } : null,
    order: r.order ? { id: r.order.id, orderCode: r.order.orderCode, paxCount: r.order.paxCount } : null,
    customer: r.customer ? { id: r.customer.id, customerCode: r.customer.customerCode, name: r.customer.name, deletedAt: r.customer.deletedAt } : null,
  }))
  return { data, total: totalRows[0]?.v ?? 0, page, pageSize }
}

export async function getTourPayment(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.select().from(tourPayments).where(and(eq(tourPayments.id, id), eq(tourPayments.workspaceId, workspaceId), notDeleted(tourPayments))).limit(1)
  return rows[0] ?? null
}

export async function getTourPaymentEnriched(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.select({
    payment: tourPayments,
    invoice: tourInvoices,
    order: tourOrders,
    customer: tourCustomers,
  }).from(tourPayments)
    .leftJoin(tourInvoices, and(eq(tourPayments.invoiceId, tourInvoices.id), eq(tourInvoices.workspaceId, workspaceId)))
    .leftJoin(tourOrders, and(eq(tourPayments.orderId, tourOrders.id), eq(tourOrders.workspaceId, workspaceId)))
    .leftJoin(tourCustomers, and(eq(tourOrders.customerId, tourCustomers.id), eq(tourCustomers.workspaceId, workspaceId)))
    .where(and(eq(tourPayments.id, id), eq(tourPayments.workspaceId, workspaceId), notDeleted(tourPayments))).limit(1)
  if (!rows[0]) return null
  const r = rows[0]
  return {
    ...r.payment,
    invoice: r.invoice ? { id: r.invoice.id, invoiceCode: r.invoice.invoiceCode, amountIdr: r.invoice.amountIdr, state: r.invoice.state } : null,
    order: r.order ? { id: r.order.id, orderCode: r.order.orderCode, paxCount: r.order.paxCount, customerId: r.order.customerId } : null,
    customer: r.customer ? { id: r.customer.id, customerCode: r.customer.customerCode, name: r.customer.name } : null,
  }
}

export async function createTourPayment(db: DbLike, workspaceId: number, input: Record<string, unknown>, createdBy?: number) {
  const invoiceId = Number((input as any).invoiceId)
  const invoiceRows = await db.select().from(tourInvoices).where(and(eq(tourInvoices.id, invoiceId), eq(tourInvoices.workspaceId, workspaceId), notDeleted(tourInvoices))).limit(1)
  if (!invoiceRows[0]) badRequest('Invoice tidak ditemukan')
  if (invoiceRows[0].state === 'CANCELLED') badRequest('Invoice CANCELLED tidak bisa menerima pembayaran')
  // Ensure orderId matches invoice orderId
  const orderId = (input as any).orderId ? Number((input as any).orderId) : invoiceRows[0].orderId
  if (orderId !== invoiceRows[0].orderId) badRequest('OrderId pembayaran harus sama dengan Order Invoice')
  // Check overpayment for VERIFIED
  const status = (input as any).status || 'DRAFT'
  if (status === 'VERIFIED') {
    const existingPaid = await db.select({ total: sql<number>`coalesce(sum(CASE WHEN ${tourPayments.status} = 'VERIFIED' THEN ${tourPayments.amountIdr} ELSE 0 END),0)` }).from(tourPayments).where(and(eq(tourPayments.workspaceId, workspaceId), eq(tourPayments.invoiceId, invoiceId), notDeleted(tourPayments)))
    const totalPaid = Number(existingPaid[0]?.total ?? 0)
    const invoiceAmount = Number(invoiceRows[0].amountIdr ?? 0)
    const newAmount = Number((input as any).amountIdr ?? 0)
    if (totalPaid + newAmount > invoiceAmount) {
      badRequest(`Pembayaran melebihi sisa tagihan. Sudah dibayar Rp${totalPaid.toLocaleString('id-ID')}, tagihan Rp${invoiceAmount.toLocaleString('id-ID')}, sisa Rp${(invoiceAmount - totalPaid).toLocaleString('id-ID')}`)
    }
  }

  const rows = await db.insert(tourPayments).values({ ...input, orderId, workspaceId, createdBy } as never).returning()
  return rows[0]
}

export async function updateTourPayment(db: DbLike, id: number, workspaceId: number, patch: Record<string, unknown>, updatedBy?: number) {
  const existing = await getTourPayment(db, id, workspaceId)
  if (!existing) return null
  if (existing.status === 'VERIFIED' && (patch as any).status !== 'VOID' && (patch as any).status !== 'VERIFIED') {
    // Prevent casual downgrade from VERIFIED to DRAFT
    if ((patch as any).status === 'DRAFT') badRequest('Pembayaran VERIFIED tidak bisa kembali ke DRAFT, gunakan VOID untuk koreksi')
  }
  if ((patch as any).invoiceId) {
    const invoiceRows = await db.select().from(tourInvoices).where(and(eq(tourInvoices.id, Number((patch as any).invoiceId)), eq(tourInvoices.workspaceId, workspaceId), notDeleted(tourInvoices))).limit(1)
    if (!invoiceRows[0]) badRequest('Invoice tidak ditemukan')
    if (invoiceRows[0].state === 'CANCELLED') badRequest('Invoice CANCELLED tidak bisa menerima pembayaran')
  }
  // Overpayment check if status VERIFIED or patch makes VERIFIED
  const newStatus = (patch as any).status || existing.status
  const newAmount = (patch as any).amountIdr !== undefined ? Number((patch as any).amountIdr) : Number(existing.amountIdr)
  const invoiceId = (patch as any).invoiceId ? Number((patch as any).invoiceId) : existing.invoiceId
  if (newStatus === 'VERIFIED') {
    const invoiceRows = await db.select().from(tourInvoices).where(and(eq(tourInvoices.id, invoiceId), eq(tourInvoices.workspaceId, workspaceId), notDeleted(tourInvoices))).limit(1)
    if (!invoiceRows[0]) badRequest('Invoice tidak ditemukan')
    const existingPaidRows = await db.select({ total: sql<number>`coalesce(sum(CASE WHEN ${tourPayments.status} = 'VERIFIED' AND ${tourPayments.id} != ${id} THEN ${tourPayments.amountIdr} ELSE 0 END),0)` }).from(tourPayments).where(and(eq(tourPayments.workspaceId, workspaceId), eq(tourPayments.invoiceId, invoiceId), notDeleted(tourPayments)))
    const totalPaidExcludingThis = Number(existingPaidRows[0]?.total ?? 0)
    const invoiceAmount = Number(invoiceRows[0].amountIdr ?? 0)
    if (totalPaidExcludingThis + newAmount > invoiceAmount) {
      badRequest(`Pembayaran melebihi sisa tagihan. Sudah dibayar Rp${totalPaidExcludingThis.toLocaleString('id-ID')} (di luar record ini), tagihan Rp${invoiceAmount.toLocaleString('id-ID')}`)
    }
  }

  const rows = await db.update(tourPayments).set({ ...patch, updatedBy, updatedAt: new Date() } as never).where(and(eq(tourPayments.id, id), eq(tourPayments.workspaceId, workspaceId))).returning()
  return rows[0] ?? null
}

export async function softDeleteTourPayment(db: DbLike, id: number, workspaceId: number) {
  const existing = await getTourPayment(db, id, workspaceId)
  if (!existing) return null
  if (existing.status === 'VERIFIED') badRequest('Pembayaran VERIFIED tidak boleh dihapus, gunakan VOID')
  const rows = await db.update(tourPayments).set({ deletedAt: new Date(), updatedAt: new Date() } as never).where(and(eq(tourPayments.id, id), eq(tourPayments.workspaceId, workspaceId))).returning({ id: tourPayments.id })
  return rows[0] ?? null
}

// ─── Expenses ───────────────────────────────────────────────────────────────
export interface ListExpensesFilter {
  workspaceId: number
  search?: string
  status?: string
  category?: string
  orderId?: number
  tripId?: number
  vendorId?: number
  bookingId?: number
  page?: number
  pageSize?: number
}

export async function listTourExpenses(db: DbLike, f: ListExpensesFilter) {
  const page = Math.max(1, f.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, f.pageSize ?? 20))
  const offset = (page - 1) * pageSize
  const conds: any[] = [eq(tourExpenses.workspaceId, f.workspaceId), notDeleted(tourExpenses)]
  if (f.status) conds.push(eq(tourExpenses.status, f.status))
  if (f.category) conds.push(eq(tourExpenses.category, f.category))
  if (f.orderId) conds.push(eq(tourExpenses.orderId, f.orderId))
  if (f.tripId) conds.push(eq(tourExpenses.tripId, f.tripId))
  if (f.vendorId) conds.push(eq(tourExpenses.vendorId, f.vendorId))
  if (f.bookingId) conds.push(eq(tourExpenses.bookingId, f.bookingId))
  if (f.search) {
    const s = `%${f.search}%`
    conds.push(or(ilike(tourExpenses.expenseCode, s), ilike(tourExpenses.description, s), ilike(tourExpenses.referenceNumber, s)))
  }
  const where = and(...conds)
  const [rows, totalRows] = await Promise.all([
    db.select().from(tourExpenses).where(where).orderBy(desc(tourExpenses.expenseDate), desc(tourExpenses.createdAt)).limit(pageSize).offset(offset),
    db.select({ v: count() }).from(tourExpenses).where(where),
  ])
  return { data: rows, total: totalRows[0]?.v ?? 0, page, pageSize }
}

export async function listTourExpensesEnriched(db: DbLike, f: ListExpensesFilter) {
  const page = Math.max(1, f.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, f.pageSize ?? 20))
  const offset = (page - 1) * pageSize
  const conds: any[] = [eq(tourExpenses.workspaceId, f.workspaceId), notDeleted(tourExpenses)]
  if (f.status) conds.push(eq(tourExpenses.status, f.status))
  if (f.category) conds.push(eq(tourExpenses.category, f.category))
  if (f.orderId) conds.push(eq(tourExpenses.orderId, f.orderId))
  if (f.tripId) conds.push(eq(tourExpenses.tripId, f.tripId))
  if (f.vendorId) conds.push(eq(tourExpenses.vendorId, f.vendorId))
  if (f.bookingId) conds.push(eq(tourExpenses.bookingId, f.bookingId))
  if (f.search) {
    const s = `%${f.search}%`
    conds.push(or(ilike(tourExpenses.expenseCode, s), ilike(tourExpenses.description, s), ilike(tourExpenses.referenceNumber, s)))
  }
  const where = and(...conds)
  const [rows, totalRows] = await Promise.all([
    db.select({
      expense: tourExpenses,
      order: tourOrders,
      customer: tourCustomers,
      trip: tourTrips,
      vendor: tourVendors,
      booking: tourBookings,
    }).from(tourExpenses)
      .leftJoin(tourOrders, and(eq(tourExpenses.orderId, tourOrders.id), eq(tourOrders.workspaceId, f.workspaceId)))
      .leftJoin(tourCustomers, and(eq(tourOrders.customerId, tourCustomers.id), eq(tourCustomers.workspaceId, f.workspaceId)))
      .leftJoin(tourTrips, and(eq(tourExpenses.tripId, tourTrips.id), eq(tourTrips.workspaceId, f.workspaceId)))
      .leftJoin(tourVendors, and(eq(tourExpenses.vendorId, tourVendors.id), eq(tourVendors.workspaceId, f.workspaceId)))
      .leftJoin(tourBookings, and(eq(tourExpenses.bookingId, tourBookings.id), eq(tourBookings.workspaceId, f.workspaceId)))
      .where(where).orderBy(desc(tourExpenses.expenseDate), desc(tourExpenses.createdAt)).limit(pageSize).offset(offset),
    db.select({ v: count() }).from(tourExpenses).where(where),
  ])
  const data = rows.map(r => ({
    ...r.expense,
    order: r.order ? { id: r.order.id, orderCode: r.order.orderCode, paxCount: r.order.paxCount } : null,
    customer: r.customer ? { id: r.customer.id, customerCode: r.customer.customerCode, name: r.customer.name } : null,
    trip: r.trip ? { id: r.trip.id, tripCode: r.trip.tripCode, name: r.trip.name } : null,
    vendor: r.vendor ? { id: r.vendor.id, vendorCode: r.vendor.vendorCode, name: r.vendor.name, deletedAt: r.vendor.deletedAt } : null,
    booking: r.booking ? { id: r.booking.id, bookingCode: r.booking.bookingCode, bookingType: r.booking.bookingType } : null,
  }))
  return { data, total: totalRows[0]?.v ?? 0, page, pageSize }
}

export async function getTourExpense(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.select().from(tourExpenses).where(and(eq(tourExpenses.id, id), eq(tourExpenses.workspaceId, workspaceId), notDeleted(tourExpenses))).limit(1)
  return rows[0] ?? null
}

export async function getTourExpenseEnriched(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.select({
    expense: tourExpenses,
    order: tourOrders,
    customer: tourCustomers,
    trip: tourTrips,
    vendor: tourVendors,
    booking: tourBookings,
  }).from(tourExpenses)
    .leftJoin(tourOrders, and(eq(tourExpenses.orderId, tourOrders.id), eq(tourOrders.workspaceId, workspaceId)))
    .leftJoin(tourCustomers, and(eq(tourOrders.customerId, tourCustomers.id), eq(tourCustomers.workspaceId, workspaceId)))
    .leftJoin(tourTrips, and(eq(tourExpenses.tripId, tourTrips.id), eq(tourTrips.workspaceId, workspaceId)))
    .leftJoin(tourVendors, and(eq(tourExpenses.vendorId, tourVendors.id), eq(tourVendors.workspaceId, workspaceId)))
    .leftJoin(tourBookings, and(eq(tourExpenses.bookingId, tourBookings.id), eq(tourBookings.workspaceId, workspaceId)))
    .where(and(eq(tourExpenses.id, id), eq(tourExpenses.workspaceId, workspaceId), notDeleted(tourExpenses))).limit(1)
  if (!rows[0]) return null
  const r = rows[0]
  return {
    ...r.expense,
    order: r.order ? { id: r.order.id, orderCode: r.order.orderCode, paxCount: r.order.paxCount, customerId: r.order.customerId } : null,
    customer: r.customer ? { id: r.customer.id, customerCode: r.customer.customerCode, name: r.customer.name } : null,
    trip: r.trip ? { id: r.trip.id, tripCode: r.trip.tripCode, name: r.trip.name } : null,
    vendor: r.vendor ? { id: r.vendor.id, vendorCode: r.vendor.vendorCode, name: r.vendor.name, deletedAt: r.vendor.deletedAt } : null,
    booking: r.booking ? { id: r.booking.id, bookingCode: r.booking.bookingCode, bookingType: r.booking.bookingType, orderId: r.booking.orderId, tripId: r.booking.tripId, vendorId: r.booking.vendorId } : null,
  }
}

function computeExpenseAmountIdr(currency: string, amount: number, snapshot: number | null | undefined): number {
  if (currency === 'IDR') return amount
  if (!snapshot || snapshot <= 0) badRequest('Kurs snapshot wajib >0 untuk SAR/USD')
  return Number(amount) * Number(snapshot)
}

export async function createTourExpense(db: DbLike, workspaceId: number, input: Record<string, unknown>, createdBy?: number) {
  // Validate relations belong to same workspace
  const orderId = (input as any).orderId ? Number((input as any).orderId) : null
  if (orderId) {
    const o = await db.select({ id: tourOrders.id }).from(tourOrders).where(and(eq(tourOrders.id, orderId), eq(tourOrders.workspaceId, workspaceId), notDeleted(tourOrders))).limit(1)
    if (!o[0]) badRequest('Order tidak ditemukan')
  }
  const tripId = (input as any).tripId ? Number((input as any).tripId) : null
  if (tripId) {
    const t = await db.select({ id: tourTrips.id }).from(tourTrips).where(and(eq(tourTrips.id, tripId), eq(tourTrips.workspaceId, workspaceId), notDeleted(tourTrips))).limit(1)
    if (!t[0]) badRequest('Trip tidak ditemukan')
  }
  const bookingId = (input as any).bookingId ? Number((input as any).bookingId) : null
  if (bookingId) {
    const b = await db.select({ id: tourBookings.id }).from(tourBookings).where(and(eq(tourBookings.id, bookingId), eq(tourBookings.workspaceId, workspaceId), notDeleted(tourBookings))).limit(1)
    if (!b[0]) badRequest('Booking tidak ditemukan')
  }
  const vendorId = (input as any).vendorId ? Number((input as any).vendorId) : null
  if (vendorId) {
    const v = await db.select({ id: tourVendors.id }).from(tourVendors).where(and(eq(tourVendors.id, vendorId), eq(tourVendors.workspaceId, workspaceId))).limit(1)
    if (!v[0]) badRequest('Vendor tidak ditemukan')
  }

  const currency = (input as any).currency || 'IDR'
  const amount = Number((input as any).amount)
  const snapshot = (input as any).exchangeRateSnapshot ? Number((input as any).exchangeRateSnapshot) : null
  const amountIdr = computeExpenseAmountIdr(currency, amount, snapshot)

  const rows = await db.insert(tourExpenses).values({ ...input, amountIdr, workspaceId, createdBy } as never).returning()
  return rows[0]
}

export async function updateTourExpense(db: DbLike, id: number, workspaceId: number, patch: Record<string, unknown>, updatedBy?: number) {
  const existing = await getTourExpense(db, id, workspaceId)
  if (!existing) return null
  if (existing.status === 'VERIFIED' && (patch as any).status === 'DRAFT') {
    badRequest('Expense VERIFIED tidak bisa kembali ke DRAFT, gunakan VOID')
  }
  if ((patch as any).orderId) {
    const o = await db.select({ id: tourOrders.id }).from(tourOrders).where(and(eq(tourOrders.id, Number((patch as any).orderId)), eq(tourOrders.workspaceId, workspaceId), notDeleted(tourOrders))).limit(1)
    if (!o[0]) badRequest('Order tidak ditemukan')
  }
  if ((patch as any).tripId) {
    const t = await db.select({ id: tourTrips.id }).from(tourTrips).where(and(eq(tourTrips.id, Number((patch as any).tripId)), eq(tourTrips.workspaceId, workspaceId), notDeleted(tourTrips))).limit(1)
    if (!t[0]) badRequest('Trip tidak ditemukan')
  }
  if ((patch as any).bookingId) {
    const b = await db.select({ id: tourBookings.id }).from(tourBookings).where(and(eq(tourBookings.id, Number((patch as any).bookingId)), eq(tourBookings.workspaceId, workspaceId), notDeleted(tourBookings))).limit(1)
    if (!b[0]) badRequest('Booking tidak ditemukan')
  }
  if ((patch as any).vendorId) {
    const v = await db.select({ id: tourVendors.id }).from(tourVendors).where(and(eq(tourVendors.id, Number((patch as any).vendorId)), eq(tourVendors.workspaceId, workspaceId))).limit(1)
    if (!v[0]) badRequest('Vendor tidak ditemukan')
  }

  // Recompute amountIdr if currency/amount/snapshot changed
  const currency = (patch as any).currency || existing.currency
  const amount = (patch as any).amount !== undefined ? Number((patch as any).amount) : Number(existing.amount)
  const snapshot = (patch as any).exchangeRateSnapshot !== undefined ? ((patch as any).exchangeRateSnapshot ? Number((patch as any).exchangeRateSnapshot) : null) : (existing.exchangeRateSnapshot ? Number(existing.exchangeRateSnapshot) : null)
  const amountIdr = computeExpenseAmountIdr(currency, amount, snapshot)

  const rows = await db.update(tourExpenses).set({ ...patch, amountIdr, updatedBy, updatedAt: new Date() } as never).where(and(eq(tourExpenses.id, id), eq(tourExpenses.workspaceId, workspaceId))).returning()
  return rows[0] ?? null
}

export async function softDeleteTourExpense(db: DbLike, id: number, workspaceId: number) {
  const existing = await getTourExpense(db, id, workspaceId)
  if (!existing) return null
  if (existing.status === 'VERIFIED') badRequest('Expense VERIFIED tidak boleh dihapus, gunakan VOID')
  const rows = await db.update(tourExpenses).set({ deletedAt: new Date(), updatedAt: new Date() } as never).where(and(eq(tourExpenses.id, id), eq(tourExpenses.workspaceId, workspaceId))).returning({ id: tourExpenses.id })
  return rows[0] ?? null
}

// ─── Finance Overview ───────────────────────────────────────────────────────
export async function getFinanceOverview(db: DbLike, workspaceId: number) {
  const today = new Date().toISOString().slice(0, 10)

  const [invoices, payments, expenses, bookings] = await Promise.all([
    db.select().from(tourInvoices).where(and(eq(tourInvoices.workspaceId, workspaceId), notDeleted(tourInvoices))),
    db.select().from(tourPayments).where(and(eq(tourPayments.workspaceId, workspaceId), notDeleted(tourPayments))),
    db.select().from(tourExpenses).where(and(eq(tourExpenses.workspaceId, workspaceId), notDeleted(tourExpenses))),
    db.select({
      booking: tourBookings,
      vendor: tourVendors,
    }).from(tourBookings)
      .leftJoin(tourVendors, and(eq(tourBookings.vendorId, tourVendors.id), eq(tourVendors.workspaceId, workspaceId)))
      .where(and(eq(tourBookings.workspaceId, workspaceId), notDeleted(tourBookings))),
  ])

  // Cash Received = sum VERIFIED Payments
  const cashReceived = payments.filter(p => p.status === 'VERIFIED').reduce((s, p) => s + Number(p.amountIdr ?? 0), 0)

  // Outstanding Receivables = sum active invoice outstanding
  // Need per-invoice paid
  const paidByInvoice: Record<number, number> = {}
  for (const p of payments) {
    if (p.status !== 'VERIFIED') continue
    paidByInvoice[p.invoiceId] = (paidByInvoice[p.invoiceId] || 0) + Number(p.amountIdr ?? 0)
  }
  let outstandingReceivables = 0
  let overdueInvoices: any[] = []
  for (const inv of invoices) {
    if (inv.state === 'CANCELLED') continue
    const paid = paidByInvoice[inv.id] || 0
    const outstanding = Math.max(Number(inv.amountIdr ?? 0) - paid, 0)
    if (outstanding > 0) {
      outstandingReceivables += outstanding
      // check overdue
      if (inv.dueDate) {
        const dueStr = toIsoDateString(inv.dueDate)
        if (dueStr && dueStr < today) {
          overdueInvoices.push({ ...inv, totalPaid: paid, outstanding, daysOverdue: Math.floor((new Date(today).getTime() - new Date(dueStr).getTime()) / (1000 * 60 * 60 * 24)) })
        }
      }
    }
  }

  const verifiedExpenses = expenses.filter(e => e.status === 'VERIFIED').reduce((s, e) => s + Number(e.amountIdr ?? 0), 0)
  const currentCashPosition = cashReceived - verifiedExpenses

  // Recent payments (verified, last 5)
  const recentPayments = payments.filter(p => p.status === 'VERIFIED').sort((a, b) => {
    const da = new Date(a.paymentDate as any).getTime()
    const db = new Date(b.paymentDate as any).getTime()
    return db - da
  }).slice(0, 5)

  // Recent expenses (verified, last 5)
  const recentExpenses = expenses.filter(e => e.status === 'VERIFIED').sort((a, b) => {
    const da = new Date(a.expenseDate as any).getTime()
    const db = new Date(b.expenseDate as any).getTime()
    return db - da
  }).slice(0, 5)

  // Overdue invoices sorted by days overdue desc
  overdueInvoices = overdueInvoices.sort((a, b) => b.daysOverdue - a.daysOverdue).slice(0, 10)

  // Upcoming Booking Due: bookings with dueDate >= today, status DRAFT/CONFIRMED/PAID, sorted asc, limit 5
  const upcomingBookings = bookings
    .map(r => r.booking)
    .filter((b: any) => {
      if (!b.dueDate) return false
      const due = toIsoDateString(b.dueDate)
      if (!due) return false
      if (due < today) return false
      if (['CANCELLED', 'COMPLETED'].includes(b.status)) return false
      return true
    })
    .sort((a: any, b: any) => {
      const da = toIsoDateString(a.dueDate) || ''
      const db = toIsoDateString(b.dueDate) || ''
      return da.localeCompare(db)
    })
    .slice(0, 5)
    .map((b: any) => {
      const vendorRow = bookings.find((r: any) => r.booking.id === b.id)?.vendor
      return {
        ...b,
        dueDate: toIsoDateString(b.dueDate),
        bookingDate: toIsoDateString(b.bookingDate),
        vendor: vendorRow ? { id: vendorRow.id, vendorCode: vendorRow.vendorCode, name: vendorRow.name } : null,
      }
    })

  return {
    cashReceived,
    outstandingReceivables,
    verifiedExpenses,
    currentCashPosition,
    overdueInvoicesCount: overdueInvoices.length,
    overdueInvoices,
    recentPayments,
    recentExpenses,
    upcomingBookings,
  }
}

// ─── Profitability ──────────────────────────────────────────────────────────
export async function getOrderProfitability(db: DbLike, workspaceId: number, filter: { search?: string; orderId?: number; page?: number; pageSize?: number }) {
  const page = Math.max(1, filter.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20))
  const offset = (page - 1) * pageSize

  // Base orders
  const conds: any[] = [eq(tourOrders.workspaceId, workspaceId), notDeleted(tourOrders)]
  if (filter.orderId) conds.push(eq(tourOrders.id, filter.orderId))
  if (filter.search) {
    const s = `%${filter.search}%`
    conds.push(or(ilike(tourOrders.orderCode, s), ilike(tourOrders.packageName, s)))
  }
  const where = and(...conds)

  const [orders, totalRows] = await Promise.all([
    db.select({
      order: tourOrders,
      customer: tourCustomers,
    }).from(tourOrders)
      .leftJoin(tourCustomers, and(eq(tourOrders.customerId, tourCustomers.id), eq(tourCustomers.workspaceId, workspaceId)))
      .where(where).orderBy(desc(tourOrders.orderDate)).limit(pageSize).offset(offset),
    db.select({ v: count() }).from(tourOrders).where(where),
  ])

  const orderIds = orders.map(r => r.order.id)

  // Bookings linked to orders
  let bookingsByOrder: Record<number, any[]> = {}
  if (orderIds.length) {
    const bookings = await db.select().from(tourBookings).where(and(eq(tourBookings.workspaceId, workspaceId), inArray(tourBookings.orderId, orderIds), notDeleted(tourBookings)))
    for (const b of bookings) {
      if (!bookingsByOrder[b.orderId!]) bookingsByOrder[b.orderId!] = []
      bookingsByOrder[b.orderId!].push(b)
    }
  }

  // Invoices and verified payments per order
  let invoicesByOrder: Record<number, any[]> = {}
  let paymentsByOrder: Record<number, number> = {}
  if (orderIds.length) {
    const invoices = await db.select().from(tourInvoices).where(and(eq(tourInvoices.workspaceId, workspaceId), inArray(tourInvoices.orderId, orderIds), notDeleted(tourInvoices)))
    for (const inv of invoices) {
      if (!invoicesByOrder[inv.orderId]) invoicesByOrder[inv.orderId] = []
      invoicesByOrder[inv.orderId].push(inv)
    }
    const invoiceIds = invoices.map(i => i.id)
    if (invoiceIds.length) {
      const payments = await db.select().from(tourPayments).where(and(eq(tourPayments.workspaceId, workspaceId), inArray(tourPayments.invoiceId, invoiceIds), eq(tourPayments.status, 'VERIFIED'), notDeleted(tourPayments)))
      for (const p of payments) {
        paymentsByOrder[p.orderId] = (paymentsByOrder[p.orderId] || 0) + Number(p.amountIdr ?? 0)
      }
    }
  }

  // Verified expenses per order and per booking linked to order
  let expensesByOrder: Record<number, any[]> = {}
  let expenseTotalByOrder: Record<number, number> = {}
  if (orderIds.length) {
    // Direct order expenses
    const directExpenses = await db.select().from(tourExpenses).where(and(eq(tourExpenses.workspaceId, workspaceId), inArray(tourExpenses.orderId, orderIds), eq(tourExpenses.status, 'VERIFIED'), notDeleted(tourExpenses)))
    for (const e of directExpenses) {
      if (!expensesByOrder[e.orderId!]) expensesByOrder[e.orderId!] = []
      expensesByOrder[e.orderId!].push(e)
      expenseTotalByOrder[e.orderId!] = (expenseTotalByOrder[e.orderId!] || 0) + Number(e.amountIdr ?? 0)
    }
    // Booking-linked expenses
    const bookingIds = Object.values(bookingsByOrder).flat().map(b => b.id)
    if (bookingIds.length) {
      const bookingExpenses = await db.select().from(tourExpenses).where(and(eq(tourExpenses.workspaceId, workspaceId), inArray(tourExpenses.bookingId, bookingIds), eq(tourExpenses.status, 'VERIFIED'), notDeleted(tourExpenses)))
      for (const e of bookingExpenses) {
        // Find which order(s) this booking belongs to
        const booking = Object.values(bookingsByOrder).flat().find(b => b.id === e.bookingId)
        if (booking && booking.orderId) {
          if (!expensesByOrder[booking.orderId]) expensesByOrder[booking.orderId] = []
          // Avoid double counting same expense if it already has orderId = same order
          const already = expensesByOrder[booking.orderId].some(ex => ex.id === e.id)
          if (!already) {
            expensesByOrder[booking.orderId].push(e)
            expenseTotalByOrder[booking.orderId] = (expenseTotalByOrder[booking.orderId] || 0) + Number(e.amountIdr ?? 0)
          }
        }
      }
    }
  }

  // TripOrders for multi-trip flag
  let tripCountByOrder: Record<number, number> = {}
  if (orderIds.length) {
    const tripOrders = await db.select().from(tourTripOrders).where(and(eq(tourTripOrders.workspaceId, workspaceId), inArray(tourTripOrders.orderId, orderIds)))
    for (const to of tripOrders) {
      tripCountByOrder[to.orderId] = (tripCountByOrder[to.orderId] || 0) + 1
    }
  }

  const data = orders.map(r => {
    const orderValue = Number(r.order.sellingPriceIdr ?? 0)
    const bookings = bookingsByOrder[r.order.id] || []
    const committedDirectCost = bookings.reduce((s, b) => s + Number(b.amountIdr ?? 0), 0)
    const expectedDirectMargin = orderValue - committedDirectCost
    const cashReceived = paymentsByOrder[r.order.id] || 0
    const actualDirectExpenses = expenseTotalByOrder[r.order.id] || 0
    const currentCashMargin = cashReceived - actualDirectExpenses
    const totalInvoiced = (invoicesByOrder[r.order.id] || []).filter(i => i.state !== 'CANCELLED').reduce((s, i) => s + Number(i.amountIdr ?? 0), 0)

    return {
      order: r.order,
      customer: r.customer ? { id: r.customer.id, customerCode: r.customer.customerCode, name: r.customer.name } : null,
      orderValue,
      committedDirectCost,
      expectedDirectMargin,
      totalInvoiced,
      cashReceived,
      actualDirectExpenses,
      currentCashMargin,
      bookingsCount: bookings.length,
      isMultiTrip: (tripCountByOrder[r.order.id] || 0) > 1,
      tripCount: tripCountByOrder[r.order.id] || 0,
    }
  })

  return { data, total: totalRows[0]?.v ?? 0, page, pageSize }
}

export async function getTripProfitability(db: DbLike, workspaceId: number, filter: { search?: string; tripId?: number; page?: number; pageSize?: number }) {
  const page = Math.max(1, filter.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20))
  const offset = (page - 1) * pageSize

  const conds: any[] = [eq(tourTrips.workspaceId, workspaceId), notDeleted(tourTrips)]
  if (filter.tripId) conds.push(eq(tourTrips.id, filter.tripId))
  if (filter.search) {
    const s = `%${filter.search}%`
    conds.push(or(ilike(tourTrips.tripCode, s), ilike(tourTrips.name, s)))
  }
  const where = and(...conds)

  const [trips, totalRows] = await Promise.all([
    db.select().from(tourTrips).where(where).orderBy(desc(tourTrips.departureDate)).limit(pageSize).offset(offset),
    db.select({ v: count() }).from(tourTrips).where(where),
  ])

  const tripIds = trips.map(t => t.id)

  let tripOrdersMap: Record<number, any[]> = {}
  let orderIdsSet = new Set<number>()
  if (tripIds.length) {
    const tripOrders = await db.select().from(tourTripOrders).where(and(eq(tourTripOrders.workspaceId, workspaceId), inArray(tourTripOrders.tripId, tripIds)))
    for (const to of tripOrders) {
      if (!tripOrdersMap[to.tripId]) tripOrdersMap[to.tripId] = []
      tripOrdersMap[to.tripId].push(to)
      orderIdsSet.add(to.orderId)
    }
  }

  const orderIds = Array.from(orderIdsSet)

  let ordersMap: Record<number, any> = {}
  if (orderIds.length) {
    const orders = await db.select().from(tourOrders).where(and(eq(tourOrders.workspaceId, workspaceId), inArray(tourOrders.id, orderIds), notDeleted(tourOrders)))
    for (const o of orders) ordersMap[o.id] = o
  }

  // Bookings per trip and per order
  let bookingsByTrip: Record<number, any[]> = {}
  let bookingsByOrder: Record<number, any[]> = {}
  if (tripIds.length) {
    const bookingsTrip = await db.select().from(tourBookings).where(and(eq(tourBookings.workspaceId, workspaceId), inArray(tourBookings.tripId, tripIds), notDeleted(tourBookings)))
    for (const b of bookingsTrip) {
      if (!bookingsByTrip[b.tripId!]) bookingsByTrip[b.tripId!] = []
      bookingsByTrip[b.tripId!].push(b)
    }
  }
  if (orderIds.length) {
    const bookingsOrder = await db.select().from(tourBookings).where(and(eq(tourBookings.workspaceId, workspaceId), inArray(tourBookings.orderId, orderIds), notDeleted(tourBookings)))
    for (const b of bookingsOrder) {
      if (!bookingsByOrder[b.orderId!]) bookingsByOrder[b.orderId!] = []
      bookingsByOrder[b.orderId!].push(b)
    }
  }

  // Verified expenses per trip
  let expensesByTrip: Record<number, number> = {}
  if (tripIds.length) {
    const expTrip = await db.select().from(tourExpenses).where(and(eq(tourExpenses.workspaceId, workspaceId), inArray(tourExpenses.tripId, tripIds), eq(tourExpenses.status, 'VERIFIED'), notDeleted(tourExpenses)))
    for (const e of expTrip) {
      expensesByTrip[e.tripId!] = (expensesByTrip[e.tripId!] || 0) + Number(e.amountIdr ?? 0)
    }
    // Also expenses via booking linked to trip
    const bookingIds = Object.values(bookingsByTrip).flat().map(b => b.id)
    if (bookingIds.length) {
      const expBooking = await db.select().from(tourExpenses).where(and(eq(tourExpenses.workspaceId, workspaceId), inArray(tourExpenses.bookingId, bookingIds), eq(tourExpenses.status, 'VERIFIED'), notDeleted(tourExpenses)))
      for (const e of expBooking) {
        const booking = Object.values(bookingsByTrip).flat().find(b => b.id === e.bookingId)
        if (booking && booking.tripId) {
          // Avoid double count if expense already counted via tripId
          if (e.tripId !== booking.tripId) {
            expensesByTrip[booking.tripId] = (expensesByTrip[booking.tripId] || 0) + Number(e.amountIdr ?? 0)
          }
        }
      }
    }
  }

  // For each trip, calculate linked order value, but flag multi-trip orders
  const data = trips.map(trip => {
    const linkedTripOrders = tripOrdersMap[trip.id] || []
    const linkedOrders = linkedTripOrders.map(to => ordersMap[to.orderId]).filter(Boolean)

    // Count multi-trip orders
    let multiTripOrders = 0
    for (const o of linkedOrders) {
      // Need to know how many trips this order is linked to – we have tripOrders for all trips in page, but order may be linked to trips outside page
      // For simplicity, we count if order appears in more than one trip in our map, or we fetch count per order
      // We'll approximate: if linkedTripOrders length for order >1 within fetched data, flag. For accurate, we'd need extra query, but for V1 we show warning.
    }

    // To get accurate multi-trip flag per order, we need to count trips per order globally
    // We'll do a separate query for those orders if needed – simplified: check if order linked to >1 trip in total (we have partial data)
    // For V1, we will flag orders that are linked to multiple trips based on tripOrdersMap size across all trips in result
    // Better: we already have tripCount per order from earlier? Let's compute from tripOrdersMap across all trips fetched
    const tripCountPerOrderInResult: Record<number, number> = {}
    for (const tid of Object.keys(tripOrdersMap)) {
      for (const to of tripOrdersMap[Number(tid)]) {
        tripCountPerOrderInResult[to.orderId] = (tripCountPerOrderInResult[to.orderId] || 0) + 1
      }
    }

    const linkedOrderValue = linkedOrders.reduce((s, o) => s + Number(o.sellingPriceIdr ?? 0), 0)
    const committedBookingCostTrip = (bookingsByTrip[trip.id] || []).reduce((s, b) => s + Number(b.amountIdr ?? 0), 0)
    const committedBookingCostOrders = linkedOrders.reduce((s, o) => {
      const bks = bookingsByOrder[o.id] || []
      return s + bks.reduce((ss, b) => ss + Number(b.amountIdr ?? 0), 0)
    }, 0)

    const verifiedExpenses = expensesByTrip[trip.id] || 0

    // Cash received from linked orders (via invoices/payments)
    // Simplified: we don't have payments per trip here, so we leave cashReceived as 0 and note limitation
    // For better, we could compute cash received per order, but that requires extra queries – for V1 we provide cost analysis

    const sharedOrders = linkedOrders.filter(o => (tripCountPerOrderInResult[o.id] || 0) > 1)

    return {
      trip,
      linkedOrdersCount: linkedOrders.length,
      linkedOrderValue,
      committedBookingCostTrip,
      committedBookingCostOrders,
      verifiedExpenses,
      sharedOrdersCount: sharedOrders.length,
      sharedOrders: sharedOrders.map(o => ({ id: o.id, orderCode: o.orderCode })),
      hasSharedOrders: sharedOrders.length > 0,
      // Note: revenue allocation ambiguous when shared
      note: sharedOrders.length > 0 ? 'Beberapa Order terhubung ke lebih dari satu Trip, nilai Order tidak dialokasikan unik per Trip' : null,
    }
  })

  return { data, total: totalRows[0]?.v ?? 0, page, pageSize }
}
