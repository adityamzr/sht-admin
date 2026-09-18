import { useDb } from '~/server/db'
import { getTourWorkspaceId } from '~/server/services/tour-operations'
import { listAccommodationStaysEnriched, getTourWorkspaceIdAccommodation } from '~/server/services/tour-accommodation'

export default defineEventHandler(async (event) => {
  const tripId = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdAccommodation(db)
  // Ensure trip exists same workspace
  const { getTourTrip } = await import('~/server/services/tour-operations')
  const trip = await getTourTrip(db, tripId, workspaceId)
  if (!trip) throw createError({ statusCode: 404, statusMessage: 'Trip tidak ditemukan' })

  const result = await listAccommodationStaysEnriched(db, { workspaceId, tripId, page: 1, pageSize: 100 })
  return { data: result.data, meta: { total: result.total } }
})
