import { useDb } from '~/server/db'
import { softDeleteTourJamaah, getTourWorkspaceId } from '~/server/services/tour-operations'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const row = await softDeleteTourJamaah(db, id, workspaceId)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Jamaah tidak ditemukan' })
  return { ok: true }
})
