import { useDb } from '~/server/db'
import { getTourWorkspaceIdFinance } from '~/server/services/tour-finance'
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

  const conds: any[] = [eq(tourExpenses.workspaceId, workspaceId), isNull(tourExpenses.deletedAt), eq(tourExpenses.status, 'VERIFIED')]
  if (q.vendorId) conds.push(eq(tourExpenses.vendorId, Number(q.vendorId)))
  if (q.category) conds.push(eq(tourExpenses.category, String(q.category)))
  if (startDate) {
    const d = toPgDate(startDate)
    if (d) conds.push(gte(tourExpenses.expenseDate, d as any))
  }
  if (endDate) {
    const d = toPgDate(endDate)
    if (d) conds.push(lte(tourExpenses.expenseDate, d as any))
  }

  // Full filtered set for accurate totals – no pagination for aggregation
  const allExpenses = await db.select().from(tourExpenses).where(and(...conds)).orderBy(tourExpenses.vendorId)

  // Group by vendor for display (limit items per group later)
  const grouped: Record<string, { vendorId: number | null; total: number; count: number; items: any[] }> = {}
  for (const e of allExpenses) {
    const key = e.vendorId ? String(e.vendorId) : 'no-vendor'
    if (!grouped[key]) grouped[key] = { vendorId: e.vendorId, total: 0, count: 0, items: [] }
    grouped[key].total += Number(e.amountIdr ?? 0)
    grouped[key].count += 1
    grouped[key].items.push(e)
  }

  // Need vendor details
  let vendorMap: Record<number, any> = {}
  const vendorIds = Object.values(grouped).map(g=>g.vendorId).filter(Boolean) as number[]
  if (vendorIds.length) {
    const { tourVendors } = await import('~/server/db/schema')
    const { inArray } = await import('drizzle-orm')
    const vendors = await db.select().from(tourVendors).where(and(eq(tourVendors.workspaceId, workspaceId), inArray(tourVendors.id, vendorIds)))
    for (const v of vendors) vendorMap[v.id] = v
  }

  const groupedArray = Object.values(grouped).map(g => ({
    vendor: g.vendorId ? vendorMap[g.vendorId] || { id: g.vendorId } : null,
    total: g.total,
    count: g.count,
    items: g.items.slice(0,10),
    allItems: g.items,
  })).sort((a,b)=>b.total-a.total)

  const totalAmount = allExpenses.reduce((s, e) => s + Number(e.amountIdr ?? 0), 0)

  return { data: groupedArray, raw: allExpenses.slice(0,100), meta: { totalAmount, totalCount: allExpenses.length, totalCountFull: allExpenses.length } }
})
