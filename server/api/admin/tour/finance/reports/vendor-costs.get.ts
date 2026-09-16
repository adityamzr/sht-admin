import { useDb } from '~/server/db'
import { listTourExpensesEnriched, getTourWorkspaceIdFinance } from '~/server/services/tour-finance'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdFinance(db)
  const result = await listTourExpensesEnriched(db, {
    workspaceId,
    status: 'VERIFIED',
    vendorId: q.vendorId ? Number(q.vendorId) : undefined,
    category: typeof q.category === 'string' ? q.category : undefined,
    page: 1,
    pageSize: 100,
  })
  let data = result.data
  if (q.startDate || q.endDate) {
    const start = q.startDate ? String(q.startDate).slice(0, 10) : null
    const end = q.endDate ? String(q.endDate).slice(0, 10) : null
    data = data.filter((e: any) => {
      const d = e.expenseDate?.slice(0, 10)
      if (!d) return false
      if (start && d < start) return false
      if (end && d > end) return false
      return true
    })
  }
  // Group by vendor
  const grouped: Record<string, { vendor: any; total: number; count: number; items: any[] }> = {}
  for (const e of data) {
    const key = e.vendor?.id ? String(e.vendor.id) : 'no-vendor'
    if (!grouped[key]) grouped[key] = { vendor: e.vendor, total: 0, count: 0, items: [] }
    grouped[key].total += Number(e.amountIdr ?? 0)
    grouped[key].count += 1
    grouped[key].items.push(e)
  }
  const groupedArray = Object.values(grouped).sort((a, b) => b.total - a.total)
  const totalAmount = data.reduce((s: number, e: any) => s + Number(e.amountIdr ?? 0), 0)
  return { data: groupedArray, raw: data, meta: { totalAmount, totalCount: data.length } }
})
