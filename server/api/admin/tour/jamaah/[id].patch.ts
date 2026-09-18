import { useDb } from '~/server/db'
import { getTourJamaah, updateTourJamaah, getTourWorkspaceId, getTourOrder } from '~/server/services/tour-operations'
import { tourJamaahPatch } from '~/server/utils/tour-validators'
import { adminTourJamaah } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, tourJamaahPatch.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const existing = await getTourJamaah(db, id, workspaceId)
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Jamaah tidak ditemukan' })
  if (body.data.orderId) {
    const order = await getTourOrder(db, body.data.orderId, workspaceId)
    if (!order) throw createError({ statusCode: 400, statusMessage: 'Order tidak ditemukan' })
  }
  const row = await updateTourJamaah(db, id, workspaceId, body.data)
  return { data: row ? adminTourJamaah(row) : null }
})
