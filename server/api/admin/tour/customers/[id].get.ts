import { useDb } from '~/server/db'
import { getTourCustomer, getTourWorkspaceId } from '~/server/services/tour-operations'
import { adminTourCustomer } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id)) throw createError({ statusCode: 400, statusMessage: 'ID tidak valid' })
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const row = await getTourCustomer(db, id, workspaceId)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Customer tidak ditemukan' })
  return { data: adminTourCustomer(row) }
})
