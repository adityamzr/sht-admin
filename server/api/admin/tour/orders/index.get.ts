import { useDb } from '~/server/db'
import { listTourOrdersWithCustomer, getTourWorkspaceId } from '~/server/services/tour-operations'
import { adminTourOrder } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)

  const result = await listTourOrdersWithCustomer(db, {
    workspaceId,
    search: typeof q.search === 'string' ? q.search.trim() : undefined,
    status: typeof q.status === 'string' ? q.status : undefined,
    orderType: typeof q.orderType === 'string' ? q.orderType : undefined,
    customerId: q.customerId ? Number(q.customerId) : undefined,
    page: Number(q.page) || 1,
    pageSize: Number(q.pageSize) || 20,
  })

  return {
    data: result.data.map((r: any) => ({
      ...adminTourOrder(r as any),
      customer: r.customer,
    })),
    meta: { page: result.page, pageSize: result.pageSize, total: result.total, pageCount: Math.ceil(result.total / result.pageSize) },
  }
})
