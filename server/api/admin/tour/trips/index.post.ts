import { useDb } from '~/server/db'
import { createTourTrip, getTourWorkspaceId } from '~/server/services/tour-operations'
import { tourTripInput } from '~/server/utils/tour-validators'
import { adminTourTrip } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, tourTripInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const row = await createTourTrip(db, workspaceId, body.data)
  return { data: adminTourTrip(row) }
})
