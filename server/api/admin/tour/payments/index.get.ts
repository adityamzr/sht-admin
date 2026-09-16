import { useDb } from '~/server/db'
import { listTourPaymentsEnriched, getTourWorkspaceIdFinance } from '~/server/services/tour-finance'
import { adminTourPayment } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdFinance(db)
  const result = await listTourPaymentsEnriched(db, {
    workspaceId,
    search: typeof q.search === 'string' ? q.search.trim() : undefined,
    status: typeof q.status === 'string' ? q.status : undefined,
    method: typeof q.method === 'string' ? q.method : undefined,
    invoiceId: q.invoiceId ? Number(q.invoiceId) : undefined,
    orderId: q.orderId ? Number(q.orderId) : undefined,
    page: Number(q.page) || 1,
    pageSize: Number(q.pageSize) || 20,
  })
  return {
    data: result.data.map((r: any) => ({
      ...adminTourPayment(r as any),
      invoice: r.invoice,
      order: r.order,
      customer: r.customer,
    })),
    meta: { page: result.page, pageSize: result.pageSize, total: result.total, pageCount: Math.ceil(result.total / result.pageSize) },
  }
})
