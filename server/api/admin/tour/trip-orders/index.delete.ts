import { useDb } from '~/server/db'
import { unassignOrderFromTrip, getTourWorkspaceId } from '~/server/services/tour-operations'
import { tourTripOrderInput } from '~/server/utils/tour-validators'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, tourTripOrderInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const row = await unassignOrderFromTrip(db, workspaceId, body.data.tripId, body.data.orderId)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Assignment tidak ditemukan' })
  return { ok: true }
})
