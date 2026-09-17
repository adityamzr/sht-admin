import { useDb } from '~/server/db'
import { getAccommodationRoom, getTourWorkspaceIdAccommodation } from '~/server/services/tour-accommodation'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdAccommodation(db)
  const row = await getAccommodationRoom(db, id, workspaceId)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Room tidak ditemukan' })
  return { data: row }
})
