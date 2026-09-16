import { useDb } from '~/server/db'
import { softDeleteTourVendor, getTourWorkspaceId } from '~/server/services/tour-operations'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const row = await softDeleteTourVendor(db, id, workspaceId)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Vendor tidak ditemukan' })
  return { ok: true }
})
