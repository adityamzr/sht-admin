import { useDb } from '~/server/db'
import { softDeleteTourOrder, getTourWorkspaceId } from '~/server/services/tour-operations'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const row = await softDeleteTourOrder(db, id, workspaceId)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Order tidak ditemukan' })
  return { ok: true }
})
