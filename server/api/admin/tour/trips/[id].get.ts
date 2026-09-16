import { useDb } from '~/server/db'
import { getTourTrip, getTourWorkspaceId, listTripOrdersEnriched, listTourBookings, getTripDerivedPax } from '~/server/services/tour-operations'
import { adminTourTrip } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const row = await getTourTrip(db, id, workspaceId)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Trip tidak ditemukan' })

  const [tripOrders, bookings, totalPax] = await Promise.all([
    listTripOrdersEnriched(db, workspaceId, id, undefined),
    listTourBookings(db, { workspaceId, tripId: id, page: 1, pageSize: 100 }),
    getTripDerivedPax(db, workspaceId, id),
  ])

  return {
    data: {
      ...adminTourTrip(row),
      tripOrders,
      bookings: bookings.data,
      totalPax,
    },
  }
})
