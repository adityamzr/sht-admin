import { useDb } from '~/server/db'
import { getTourOrder, getTourWorkspaceId, listTourJamaah, listTourBookings, listTripOrders } from '~/server/services/tour-operations'
import { adminTourOrder } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const row = await getTourOrder(db, id, workspaceId)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Order tidak ditemukan' })

  // Fetch linked data for operational center view
  const [jamaahRes, bookingsRes, tripOrders] = await Promise.all([
    listTourJamaah(db, { workspaceId, orderId: id, page: 1, pageSize: 100 }),
    listTourBookings(db, { workspaceId, orderId: id, page: 1, pageSize: 100 }),
    listTripOrders(db, workspaceId, undefined, id),
  ])

  return {
    data: {
      ...adminTourOrder(row),
      jamaah: jamaahRes.data,
      bookings: bookingsRes.data,
      tripOrders,
    },
  }
})
