import { useDb } from '~/server/db'
import { getTourTrip, updateTourTrip, getTourWorkspaceId } from '~/server/services/tour-operations'
import { tourTripPatch } from '~/server/utils/tour-validators'
import { adminTourTrip } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, tourTripPatch.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const existing = await getTourTrip(db, id, workspaceId)
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Trip tidak ditemukan' })
  const row = await updateTourTrip(db, id, workspaceId, body.data)
  return { data: row ? adminTourTrip(row) : null }
})
