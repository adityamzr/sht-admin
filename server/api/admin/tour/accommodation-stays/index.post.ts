import { useDb } from '~/server/db'
import { createAccommodationStay, getTourWorkspaceIdAccommodation } from '~/server/services/tour-accommodation'
import { tourAccommodationStayInput } from '~/server/utils/tour-validators'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = tourAccommodationStayInput.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.errors.map(e=>`${e.path.join('.')}: ${e.message}`).join('; ') })

  const db = useDb()
  const workspaceId = await getTourWorkspaceIdAccommodation(db)
  function toIsoDate(d: unknown): string {
    if (!d) return ''
    if (d instanceof Date) return d.toISOString().slice(0,10)
    return String(d).slice(0,10)
  }
  const row = await createAccommodationStay(db, workspaceId, {
    tripId: parsed.data.tripId,
    bookingId: parsed.data.bookingId,
    hotelName: parsed.data.hotelName,
    city: parsed.data.city,
    checkInDate: toIsoDate(parsed.data.checkInDate),
    checkOutDate: toIsoDate(parsed.data.checkOutDate),
    notes: parsed.data.notes || null,
    orderIds: parsed.data.orderIds,
  })
  return { data: row }
})
