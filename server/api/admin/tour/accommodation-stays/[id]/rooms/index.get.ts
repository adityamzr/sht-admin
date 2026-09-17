import { useDb } from '~/server/db'
import { listAccommodationRooms, getTourWorkspaceIdAccommodation } from '~/server/services/tour-accommodation'

export default defineEventHandler(async (event) => {
  const stayId = Number(getRouterParam(event, 'id'))
  const q = getQuery(event)
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdAccommodation(db)
  const result = await listAccommodationRooms(db, {
    workspaceId,
    stayId,
    search: typeof q.search === 'string' ? q.search : undefined,
    page: Number(q.page) || 1,
    pageSize: Number(q.pageSize) || 50,
  })
  return { data: result.data, meta: { total: result.total } }
})
