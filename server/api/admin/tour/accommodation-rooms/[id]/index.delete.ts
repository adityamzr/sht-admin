import { useDb } from '~/server/db'
import { softDeleteAccommodationRoom, getTourWorkspaceIdAccommodation } from '~/server/services/tour-accommodation'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdAccommodation(db)
  const row = await softDeleteAccommodationRoom(db, id, workspaceId)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Room tidak ditemukan atau masih ada occupant' })
  return { data: row }
})
