import { useDb } from '~/server/db'
import { assignOrderToTrip, getTourWorkspaceId } from '~/server/services/tour-operations'
import { tourTripOrderInput } from '~/server/utils/tour-validators'
import { adminTourTripOrder } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, tourTripOrderInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  try {
    const row = await assignOrderToTrip(db, workspaceId, body.data.tripId, body.data.orderId)
    if (!row) return { data: null, message: 'Already assigned' }
    return { data: adminTourTripOrder(row) }
  } catch (e: any) {
    throw createError({ statusCode: 400, statusMessage: e.message ?? 'Gagal assign' })
  }
})
