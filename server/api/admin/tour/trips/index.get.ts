import { useDb } from '~/server/db'
import { listTourTrips, getTourWorkspaceId } from '~/server/services/tour-operations'
import { adminTourTrip } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const result = await listTourTrips(db, {
    workspaceId,
    search: typeof q.search === 'string' ? q.search.trim() : undefined,
    status: typeof q.status === 'string' ? q.status : undefined,
    page: Number(q.page) || 1,
    pageSize: Number(q.pageSize) || 20,
  })
  return {
    data: result.data.map(adminTourTrip),
    meta: { page: result.page, pageSize: result.pageSize, total: result.total, pageCount: Math.ceil(result.total / result.pageSize) },
  }
})
