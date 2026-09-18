import { useDb } from '~/server/db'
import { moveJamaahToRoom, getTourWorkspaceIdAccommodation } from '~/server/services/tour-accommodation'
import { tourRoomMoveInput } from '~/server/utils/tour-validators'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = tourRoomMoveInput.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.errors.map(e=>`${e.path.join('.')}: ${e.message}`).join('; ') })

  const db = useDb()
  const workspaceId = await getTourWorkspaceIdAccommodation(db)
  const row = await moveJamaahToRoom(db, workspaceId, {
    stayId: parsed.data.stayId,
    jamaahId: parsed.data.jamaahId,
    toRoomId: parsed.data.toRoomId,
  })
  return { data: row }
})
