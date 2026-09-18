import { useDb } from '~/server/db'
import { softDeleteTourCustomer, getTourWorkspaceId } from '~/server/services/tour-operations'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const row = await softDeleteTourCustomer(db, id, workspaceId)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Customer tidak ditemukan' })
  return { ok: true }
})
