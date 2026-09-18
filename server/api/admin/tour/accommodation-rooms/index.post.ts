import { useDb } from '~/server/db'
import { createAccommodationRoom, getTourWorkspaceIdAccommodation } from '~/server/services/tour-accommodation'
import { tourAccommodationRoomInput } from '~/server/utils/tour-validators'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = tourAccommodationRoomInput.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.errors.map(e=>`${e.path.join('.')}: ${e.message}`).join('; ') })

  const db = useDb()
  const workspaceId = await getTourWorkspaceIdAccommodation(db)
  const row = await createAccommodationRoom(db, workspaceId, {
    stayId: parsed.data.stayId,
    roomLabel: parsed.data.roomLabel,
    roomNumber: parsed.data.roomNumber || null,
    roomType: parsed.data.roomType,
    capacity: parsed.data.capacity,
    roomingMode: parsed.data.roomingMode,
    orderId: parsed.data.orderId || null,
    notes: parsed.data.notes || null,
  })
  return { data: row }
})
