import { useDb } from '~/server/db'
import { listAccommodationRooms, getTourWorkspaceIdAccommodation } from '~/server/services/tour-accommodation'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdAccommodation(db)
  const result = await listAccommodationRooms(db, {
    workspaceId,
    stayId: q.stayId ? Number(q.stayId) : undefined,
    search: typeof q.search === 'string' ? q.search : undefined,
    roomType: typeof q.roomType === 'string' ? q.roomType : undefined,
    roomingMode: typeof q.roomingMode === 'string' ? q.roomingMode : undefined,
    page: Number(q.page) || 1,
    pageSize: Number(q.pageSize) || 50,
  })
  return { data: result.data, meta: { total: result.total, page: result.page, pageSize: result.pageSize, pageCount: Math.ceil(result.total / result.pageSize) } }
})
