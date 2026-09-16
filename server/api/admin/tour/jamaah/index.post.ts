import { useDb } from '~/server/db'
import { createTourJamaah, getTourWorkspaceId, getTourOrder } from '~/server/services/tour-operations'
import { tourJamaahInput } from '~/server/utils/tour-validators'
import { adminTourJamaah } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, tourJamaahInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const order = await getTourOrder(db, body.data.orderId, workspaceId)
  if (!order) throw createError({ statusCode: 400, statusMessage: 'Order tidak ditemukan' })
  const row = await createTourJamaah(db, workspaceId, body.data)
  return { data: adminTourJamaah(row) }
})
