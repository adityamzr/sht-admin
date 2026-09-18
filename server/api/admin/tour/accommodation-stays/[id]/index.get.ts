import { useDb } from '~/server/db'
import { getAccommodationStayEnriched, getTourWorkspaceIdAccommodation } from '~/server/services/tour-accommodation'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdAccommodation(db)
  const row = await getAccommodationStayEnriched(db, id, workspaceId)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Stay tidak ditemukan' })
  return { data: row }
})
