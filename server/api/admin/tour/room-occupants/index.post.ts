import { useDb } from '~/server/db'
import { assignJamaahToRoom, getTourWorkspaceIdAccommodation } from '~/server/services/tour-accommodation'
import { tourRoomOccupantInput } from '~/server/utils/tour-validators'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = tourRoomOccupantInput.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.errors.map(e=>`${e.path.join('.')}: ${e.message}`).join('; ') })

  const db = useDb()
  const workspaceId = await getTourWorkspaceIdAccommodation(db)
  const row = await assignJamaahToRoom(db, workspaceId, {
    stayId: parsed.data.stayId,
    roomId: parsed.data.roomId,
    jamaahId: parsed.data.jamaahId,
  })
  return { data: row }
})
