import { useDb } from '~/server/db'
import { updateAccommodationStay, getTourWorkspaceIdAccommodation } from '~/server/services/tour-accommodation'
import { tourAccommodationStayPatch } from '~/server/utils/tour-validators'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const parsed = tourAccommodationStayPatch.safeParse(body)
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
  const patch: any = {}
  if (parsed.data.bookingId !== undefined) patch.bookingId = parsed.data.bookingId
  if (parsed.data.hotelName !== undefined) patch.hotelName = parsed.data.hotelName
  if (parsed.data.city !== undefined) patch.city = parsed.data.city
  if (parsed.data.checkInDate) patch.checkInDate = toIsoDate(parsed.data.checkInDate)
  if (parsed.data.checkOutDate) patch.checkOutDate = toIsoDate(parsed.data.checkOutDate)
  if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes
  if (parsed.data.orderIds !== undefined) patch.orderIds = parsed.data.orderIds

  const row = await updateAccommodationStay(db, id, workspaceId, patch)
  return { data: row }
})
