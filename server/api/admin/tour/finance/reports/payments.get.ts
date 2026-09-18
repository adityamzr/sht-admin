import { useDb } from '~/server/db'
import { listTourPaymentsEnriched, getTourWorkspaceIdFinance } from '~/server/services/tour-finance'
import { tourPayments } from '~/server/db/schema'
import { and, eq, gte, lte, isNull, sql, count } from 'drizzle-orm'

function toPgDate(dateKey: string | undefined): Date | null {
  if (!dateKey) return null
  const s = dateKey.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T00:00:00.000Z`)
  return isNaN(d.getTime()) ? null : d
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdFinance(db)

  const startDate = q.startDate ? String(q.startDate).slice(0,10) : undefined
  const endDate = q.endDate ? String(q.endDate).slice(0,10) : undefined

  // Paginated data – DB-level filtering
  const result = await listTourPaymentsEnriched(db, {
    workspaceId,
    status: typeof q.status === 'string' ? q.status : undefined,
    method: typeof q.method === 'string' ? q.method : undefined,
    orderId: q.orderId ? Number(q.orderId) : undefined,
    invoiceId: q.invoiceId ? Number(q.invoiceId) : undefined,
    startDate,
    endDate,
    page: Number(q.page) || 1,
    pageSize: Number(q.pageSize) || 50,
  })

  // Aggregate total over FULL filtered set (not just page) – VERIFIED only
  const conds: any[] = [eq(tourPayments.workspaceId, workspaceId), isNull(tourPayments.deletedAt)]
  if (q.status) conds.push(eq(tourPayments.status, String(q.status)))
  else conds.push(eq(tourPayments.status, 'VERIFIED'))
  if (q.method) conds.push(eq(tourPayments.method, String(q.method)))
  if (q.orderId) conds.push(eq(tourPayments.orderId, Number(q.orderId)))
  if (q.invoiceId) conds.push(eq(tourPayments.invoiceId, Number(q.invoiceId)))
  if (startDate) {
    const d = toPgDate(startDate)
    if (d) conds.push(gte(tourPayments.paymentDate, d as any))
  }
  if (endDate) {
    const d = toPgDate(endDate)
    if (d) conds.push(lte(tourPayments.paymentDate, d as any))
  }

  const agg = await db.select({
    totalAmount: sql<number>`coalesce(sum(CASE WHEN ${tourPayments.status} = 'VERIFIED' THEN ${tourPayments.amountIdr} ELSE 0 END),0)`,
    totalCount: count(),
  }).from(tourPayments).where(and(...conds))

  const totalAmount = Number(agg[0]?.totalAmount ?? 0)
  const totalCount = Number(agg[0]?.totalCount ?? 0)

  return { data: result.data, meta: { ...result, totalAmount, totalCountFull: totalCount } }
})
