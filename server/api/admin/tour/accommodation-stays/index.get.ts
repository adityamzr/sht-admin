import { useDb } from '~/server/db'
import { listAccommodationStaysEnriched, getTourWorkspaceIdAccommodation } from '~/server/services/tour-accommodation'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdAccommodation(db)
  const result = await listAccommodationStaysEnriched(db, {
    workspaceId,
    tripId: q.tripId ? Number(q.tripId) : undefined,
    search: typeof q.search === 'string' ? q.search : undefined,
    city: typeof q.city === 'string' ? q.city : undefined,
    page: Number(q.page) || 1,
    pageSize: Number(q.pageSize) || 20,
  })
  return { data: result.data, meta: { total: result.total, page: result.page, pageSize: result.pageSize, pageCount: Math.ceil(result.total / result.pageSize) } }
})
