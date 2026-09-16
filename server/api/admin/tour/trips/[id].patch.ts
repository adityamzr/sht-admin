import { useDb } from '~/server/db'
import { getTourTrip, updateTourTrip, getTourWorkspaceId } from '~/server/services/tour-operations'
import { tourTripPatch } from '~/server/utils/tour-validators'
import { adminTourTrip } from '~/server/utils/tour-serializers'

function toISODate(d: unknown): string {
  if (!d) return ''
  if (d instanceof Date) return d.toISOString().slice(0, 10)
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
  const finalDeparture = (body.data.departureDate as string) ?? toISODate(existing.departureDate)
  const finalReturn = (body.data.returnDate as string) ?? toISODate(existing.returnDate)

  if (finalDeparture && finalReturn && finalReturn < finalDeparture) {
    throw createError({ statusCode: 400, statusMessage: 'returnDate harus >= departureDate (final state)' })
  }

  const row = await updateTourTrip(db, id, workspaceId, body.data)
  return { data: row ? adminTourTrip(row) : null }
})
