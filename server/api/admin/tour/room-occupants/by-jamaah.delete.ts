import { useDb } from '~/server/db'
import { removeJamaahFromStay, getTourWorkspaceIdAccommodation } from '~/server/services/tour-accommodation'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const stayId = Number(body?.stayId)
  const jamaahId = Number(body?.jamaahId)
  if (!stayId || !jamaahId) throw createError({ statusCode: 400, statusMessage: 'stayId dan jamaahId wajib' })
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdAccommodation(db)
  const row = await removeJamaahFromStay(db, workspaceId, stayId, jamaahId)
  return { data: row }
})
