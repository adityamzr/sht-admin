import { useDb } from '~/server/db'
import { listTourPaymentsEnriched, getTourWorkspaceIdFinance } from '~/server/services/tour-finance'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdFinance(db)
  const result = await listTourPaymentsEnriched(db, {
    workspaceId,
    status: typeof q.status === 'string' ? q.status : undefined,
    method: typeof q.method === 'string' ? q.method : undefined,
    orderId: q.orderId ? Number(q.orderId) : undefined,
    invoiceId: q.invoiceId ? Number(q.invoiceId) : undefined,
    page: Number(q.page) || 1,
    pageSize: Number(q.pageSize) || 50,
  })
  // date range filter in memory for V1 (since service doesn't have date range yet)
  let data = result.data
  if (q.startDate || q.endDate) {
    const start = q.startDate ? String(q.startDate).slice(0, 10) : null
    const end = q.endDate ? String(q.endDate).slice(0, 10) : null
    data = data.filter((p: any) => {
      const d = p.paymentDate?.slice(0, 10)
      if (!d) return false
      if (start && d < start) return false
      if (end && d > end) return false
      return true
    })
  }
  const totalAmount = data.filter((p: any) => p.status === 'VERIFIED').reduce((s: number, p: any) => s + Number(p.amountIdr ?? 0), 0)
  return { data, meta: { ...result, totalAmount } }
})
