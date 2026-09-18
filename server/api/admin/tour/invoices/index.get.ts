import { useDb } from '~/server/db'
import { listTourInvoicesEnriched, getTourWorkspaceIdFinance } from '~/server/services/tour-finance'
import { adminTourInvoice } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdFinance(db)
  const result = await listTourInvoicesEnriched(db, {
    workspaceId,
    search: typeof q.search === 'string' ? q.search.trim() : undefined,
    state: typeof q.state === 'string' ? q.state : undefined,
    orderId: q.orderId ? Number(q.orderId) : undefined,
    page: Number(q.page) || 1,
    pageSize: Number(q.pageSize) || 20,
  })
  return {
    data: result.data.map((r: any) => ({
      ...adminTourInvoice(r as any),
      order: r.order,
      customer: r.customer,
      totalPaid: r.totalPaid,
      outstanding: r.outstanding,
      paymentStatus: r.paymentStatus,
    })),
    meta: { page: result.page, pageSize: result.pageSize, total: result.total, pageCount: Math.ceil(result.total / result.pageSize) },
  }
})
