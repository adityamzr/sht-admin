import { useDb } from '~/server/db'
import { listTourExpensesEnriched, getTourWorkspaceIdFinance } from '~/server/services/tour-finance'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdFinance(db)
  const result = await listTourExpensesEnriched(db, {
    workspaceId,
    status: typeof q.status === 'string' ? q.status : undefined,
    category: typeof q.category === 'string' ? q.category : undefined,
    orderId: q.orderId ? Number(q.orderId) : undefined,
    tripId: q.tripId ? Number(q.tripId) : undefined,
    vendorId: q.vendorId ? Number(q.vendorId) : undefined,
    page: Number(q.page) || 1,
    pageSize: Number(q.pageSize) || 50,
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
  const totalAmount = data.filter((e: any) => e.status === 'VERIFIED').reduce((s: number, e: any) => s + Number(e.amountIdr ?? 0), 0)
  return { data, meta: { ...result, totalAmount } }
})
