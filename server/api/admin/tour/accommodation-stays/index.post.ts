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
    if (typeof d === 'string') return d.slice(0,10)
    if (d instanceof Date) {
      try { return d.toISOString().slice(0,10) } catch { return String(d).slice(0,10) }
    }
    if (typeof d === 'object' && d !== null && typeof (d as any).toISOString === 'function') {
      try { return (d as any).toISOString().slice(0,10) } catch {}
    }
    try {
      const date = new Date(d as any)
      if (!isNaN(date.getTime())) return date.toISOString().slice(0,10)
    } catch {}
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
