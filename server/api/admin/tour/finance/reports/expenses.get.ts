import { useDb } from '~/server/db'
import { listTourExpensesEnriched, getTourWorkspaceIdFinance } from '~/server/services/tour-finance'
import { tourExpenses } from '~/server/db/schema'
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

  const result = await listTourExpensesEnriched(db, {
    workspaceId,
    status: typeof q.status === 'string' ? q.status : 'VERIFIED',
    category: typeof q.category === 'string' ? q.category : undefined,
    orderId: q.orderId ? Number(q.orderId) : undefined,
    tripId: q.tripId ? Number(q.tripId) : undefined,
    vendorId: q.vendorId ? Number(q.vendorId) : undefined,
    bookingId: q.bookingId ? Number(q.bookingId) : undefined,
    startDate,
    endDate,
    page: Number(q.page) || 1,
    pageSize: Number(q.pageSize) || 50,
  })

  const conds: any[] = [eq(tourExpenses.workspaceId, workspaceId), isNull(tourExpenses.deletedAt)]
  if (q.status) conds.push(eq(tourExpenses.status, String(q.status)))
  else conds.push(eq(tourExpenses.status, 'VERIFIED'))
  if (q.category) conds.push(eq(tourExpenses.category, String(q.category)))
  if (q.orderId) conds.push(eq(tourExpenses.orderId, Number(q.orderId)))
  if (q.tripId) conds.push(eq(tourExpenses.tripId, Number(q.tripId)))
  if (q.vendorId) conds.push(eq(tourExpenses.vendorId, Number(q.vendorId)))
  if (q.bookingId) conds.push(eq(tourExpenses.bookingId, Number(q.bookingId)))
  if (startDate) {
    const d = toPgDate(startDate)
    if (d) conds.push(gte(tourExpenses.expenseDate, d as any))
  }
  if (endDate) {
    const d = toPgDate(endDate)
    if (d) conds.push(lte(tourExpenses.expenseDate, d as any))
  }

  const agg = await db.select({
    totalAmount: sql<number>`coalesce(sum(CASE WHEN ${tourExpenses.status} = 'VERIFIED' THEN ${tourExpenses.amountIdr} ELSE 0 END),0)`,
    totalCount: count(),
  }).from(tourExpenses).where(and(...conds))

  return { data: result.data, meta: { ...result, totalAmount: Number(agg[0]?.totalAmount ?? 0), totalCountFull: Number(agg[0]?.totalCount ?? 0) } }
})
