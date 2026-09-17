import { useDb } from '~/server/db'
import { getTourWorkspaceIdFinance } from '~/server/services/tour-finance'
import { tourInvoices, tourPayments } from '~/server/db/schema'
import { and, eq, gte, lte, isNull, sql, count } from 'drizzle-orm'

function toIso(d: any): string | null {
  if (!d) return null
  if (typeof d === 'string') return d.slice(0,10)
  if (d instanceof Date) return d.toISOString().slice(0,10)
  return String(d).slice(0,10)
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdFinance(db)

  const startDate = q.startDate ? String(q.startDate).slice(0,10) : undefined
  const endDate = q.endDate ? String(q.endDate).slice(0,10) : undefined

  // DB-level filtering for ISSUED invoices only
  const conds: any[] = [eq(tourInvoices.workspaceId, workspaceId), isNull(tourInvoices.deletedAt), eq(tourInvoices.state, 'ISSUED')]
  if (q.orderId) conds.push(eq(tourInvoices.orderId, Number(q.orderId)))
  if (startDate) conds.push(gte(tourInvoices.issueDate, startDate as any))
  if (endDate) conds.push(lte(tourInvoices.issueDate, endDate as any))

  // Fetch all ISSUED invoices matching filters (without pagination for accurate totals, but limit to reasonable)
  const invoices = await db.select().from(tourInvoices).where(and(...conds)).orderBy(tourInvoices.dueDate)

  // Paid map VERIFIED only
  const invoiceIds = invoices.map(i => i.id)
  let paidMap: Record<number, number> = {}
  if (invoiceIds.length) {
    const { inArray } = await import('drizzle-orm')
    const payments = await db.select({
      invoiceId: tourPayments.invoiceId,
      total: sql<number>`coalesce(sum(CASE WHEN ${tourPayments.status} = 'VERIFIED' THEN ${tourPayments.amountIdr} ELSE 0 END),0)`,
    }).from(tourPayments).where(and(eq(tourPayments.workspaceId, workspaceId), isNull(tourPayments.deletedAt), inArray(tourPayments.invoiceId, invoiceIds))).groupBy(tourPayments.invoiceId)
    for (const p of payments) paidMap[p.invoiceId] = Number(p.total ?? 0)
  }

  let data: any[] = []
  let totalOutstanding = 0
  for (const inv of invoices) {
    const paid = paidMap[inv.id] || 0
    const outstanding = Math.max(Number(inv.amountIdr ?? 0) - paid, 0)
    if (outstanding > 0) {
      totalOutstanding += outstanding
      data.push({ ...inv, totalPaid: paid, outstanding, paymentStatus: outstanding===0?'PAID': paid>0?'PARTIAL': (()=>{ const today=new Date().toISOString().slice(0,10); const due=toIso(inv.dueDate); if(due && due < today) return 'OVERDUE'; return 'UNPAID'})() })
    }
  }

  // Pagination for UI (but totals are from full set)
  const page = Number(q.page) || 1
  const pageSize = Number(q.pageSize) || 50
  const offset = (page-1)*pageSize
  const paged = data.slice(offset, offset+pageSize)

  return { data: paged, meta: { total: data.length, page, pageSize, totalOutstanding, totalCountFull: data.length } }
})
