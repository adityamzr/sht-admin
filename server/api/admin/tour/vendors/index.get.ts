import { useDb } from '~/server/db'
import { listTourVendors, getTourWorkspaceId } from '~/server/services/tour-operations'
import { adminTourVendor } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const result = await listTourVendors(db, {
    workspaceId,
    search: typeof q.search === 'string' ? q.search.trim() : undefined,
    vendorType: typeof q.vendorType === 'string' ? q.vendorType : undefined,
    status: typeof q.status === 'string' ? q.status : undefined,
    page: Number(q.page) || 1,
    pageSize: Number(q.pageSize) || 20,
  })
  return {
    data: result.data.map(adminTourVendor),
    meta: { page: result.page, pageSize: result.pageSize, total: result.total, pageCount: Math.ceil(result.total / result.pageSize) },
  }
})
