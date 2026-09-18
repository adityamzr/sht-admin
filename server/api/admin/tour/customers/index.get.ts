import { useDb } from '~/server/db'
import { listTourCustomers, getTourWorkspaceId } from '~/server/services/tour-operations'
import { adminTourCustomer } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)

  const search = typeof q.search === 'string' ? q.search.trim() : undefined
  const customerType = typeof q.customerType === 'string' ? q.customerType : undefined
  const source = typeof q.source === 'string' ? q.source : undefined
  const page = Number(q.page) || 1
  const pageSize = Number(q.pageSize) || 20

  const result = await listTourCustomers(db, {
    workspaceId,
    search: search || undefined,
    customerType: customerType || undefined,
    source: source || undefined,
    page,
    pageSize,
  })

  return {
    data: result.data.map(adminTourCustomer),
    meta: {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      pageCount: Math.ceil(result.total / result.pageSize),
    },
  }
})
