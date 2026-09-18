import { useDb } from '~/server/db'
import { getTourWorkspaceIdFinance } from '~/server/services/tour-finance'
import { tourInvoices, tourPayments } from '~/server/db/schema'
import { and, eq, gte, lte, isNull, sql, count } from 'drizzle-orm'

function toIso(d: any): string | null {
  if (!d) return null
  if (typeof d === 'string') {
    const s = d.slice(0,10)
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : s
  }
  if (d instanceof Date) {
    try { return d.toISOString().slice(0,10) } catch { return null }
  }
  if (typeof d === 'object' && d !== null && typeof (d as any).toISOString === 'function') {
    try { return (d as any).toISOString().slice(0,10) } catch {}
  }
  try {
    const date = new Date(d)
    if (!isNaN(date.getTime())) return date.toISOString().slice(0,10)
  } catch {}
  return String(d).slice(0,10)
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdFinance(db)

  const startDate = q.startDate ? String(q.startDate).slice(0,10) : undefined
  const endDate = q.endDate ? String(q.endDate).slice(0,10) : undefined

  function toPgDate(dateKey: string | undefined): Date | null {
    if (!dateKey) return null
    const s = dateKey.slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
    const d = new Date(`${s}T00:00:00.000Z`)
    return isNaN(d.getTime()) ? null : d
  }

  // DB-level filtering for ISSUED invoices only
  const conds: any[] = [eq(tourInvoices.workspaceId, workspaceId), isNull(tourInvoices.deletedAt), eq(tourInvoices.state, 'ISSUED')]
  if (q.orderId) conds.push(eq(tourInvoices.orderId, Number(q.orderId)))
  if (startDate) {
    const d = toPgDate(startDate)
    if (d) conds.push(gte(tourInvoices.issueDate, d as any))
  }
  if (endDate) {
    const d = toPgDate(endDate)
    if (d) conds.push(lte(tourInvoices.issueDate, d as any))
  }

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
