import { useDb } from '~/server/db'
import { softDeleteTourTrip, getTourWorkspaceId } from '~/server/services/tour-operations'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const row = await softDeleteTourTrip(db, id, workspaceId)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Trip tidak ditemukan' })
  return { ok: true }
})
