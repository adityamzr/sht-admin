import { useDb } from '~/server/db'
import { getTourTrip, updateTourTrip, getTourWorkspaceId } from '~/server/services/tour-operations'
import { tourTripPatch } from '~/server/utils/tour-validators'
import { adminTourTrip } from '~/server/utils/tour-serializers'

function toISODate(d: unknown): string {
  if (!d) return ''
  if (typeof d === 'string') return d.slice(0, 10)
  if (d instanceof Date) {
    try { return d.toISOString().slice(0, 10) } catch { return String(d).slice(0, 10) }
  }
  if (typeof d === 'object' && d !== null && typeof (d as any).toISOString === 'function') {
    try { return (d as any).toISOString().slice(0, 10) } catch {}
  }
  try {
    const date = new Date(d as any)
    if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10)
  } catch {}
  return String(d).slice(0, 10)
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, tourTripPatch.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const existing = await getTourTrip(db, id, workspaceId)
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Trip tidak ditemukan' })

  // Merge existing with patch to validate final state
  const finalDeparture = (body.data.departureDate as Date | undefined) ?? (existing.departureDate as Date)
  const finalReturn = (body.data.returnDate as Date | undefined) ?? (existing.returnDate as Date)

  if (finalDeparture && finalReturn && finalReturn.getTime() < finalDeparture.getTime()) {
    throw createError({ statusCode: 400, statusMessage: 'returnDate harus >= departureDate (final state)' })
  }

  const row = await updateTourTrip(db, id, workspaceId, body.data)
  return { data: row ? adminTourTrip(row) : null }
})
