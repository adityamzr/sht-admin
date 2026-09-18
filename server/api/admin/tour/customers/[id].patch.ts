import { useDb } from '~/server/db'
import { getTourCustomer, updateTourCustomer, getTourWorkspaceId } from '~/server/services/tour-operations'
import { tourCustomerPatch } from '~/server/utils/tour-validators'
import { adminTourCustomer } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, tourCustomerPatch.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  if (!(await getTourCustomer(db, id, workspaceId))) throw createError({ statusCode: 404, statusMessage: 'Customer tidak ditemukan' })
  const row = await updateTourCustomer(db, id, workspaceId, body.data)
  return { data: row ? adminTourCustomer(row) : null }
})
