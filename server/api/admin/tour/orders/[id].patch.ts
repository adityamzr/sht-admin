import { useDb } from '~/server/db'
import { getTourOrder, updateTourOrder, getTourWorkspaceId, getTourCustomer } from '~/server/services/tour-operations'
import { tourOrderPatch } from '~/server/utils/tour-validators'
import { adminTourOrder } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, tourOrderPatch.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const existing = await getTourOrder(db, id, workspaceId)
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Order tidak ditemukan' })

  if (body.data.customerId) {
    const customer = await getTourCustomer(db, body.data.customerId, workspaceId)
    if (!customer) throw createError({ statusCode: 400, statusMessage: 'Customer tidak ditemukan' })
  }

  const row = await updateTourOrder(db, id, workspaceId, body.data)
  return { data: row ? adminTourOrder(row) : null }
})
