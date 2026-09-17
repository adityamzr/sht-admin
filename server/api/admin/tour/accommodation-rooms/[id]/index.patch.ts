import { useDb } from '~/server/db'
import { updateAccommodationRoom, getTourWorkspaceIdAccommodation } from '~/server/services/tour-accommodation'
import { tourAccommodationRoomPatch } from '~/server/utils/tour-validators'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const parsed = tourAccommodationRoomPatch.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.errors.map(e=>`${e.path.join('.')}: ${e.message}`).join('; ') })

  const db = useDb()
  const workspaceId = await getTourWorkspaceIdAccommodation(db)
  const row = await updateAccommodationRoom(db, id, workspaceId, {
    roomLabel: parsed.data.roomLabel,
    roomNumber: parsed.data.roomNumber,
    roomType: parsed.data.roomType,
    capacity: parsed.data.capacity,
    roomingMode: parsed.data.roomingMode,
    orderId: parsed.data.orderId,
    notes: parsed.data.notes,
  })
  return { data: row }
})
