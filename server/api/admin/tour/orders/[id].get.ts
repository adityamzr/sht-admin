import { useDb } from '~/server/db'
import { getTourOrder, getTourCustomerIncludingDeleted, getTourWorkspaceId, listTourJamaah, listTourBookings, listTripOrdersEnriched } from '~/server/services/tour-operations'
import { adminTourOrder } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const row = await getTourOrder(db, id, workspaceId)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Order tidak ditemukan' })

  // Fetch linked data for operational center view — include archived customer
  const [jamaahRes, bookingsRes, tripOrders, customer] = await Promise.all([
    listTourJamaah(db, { workspaceId, orderId: id, page: 1, pageSize: 100 }),
    listTourBookings(db, { workspaceId, orderId: id, page: 1, pageSize: 100 }),
    listTripOrdersEnriched(db, workspaceId, undefined, id),
    getTourCustomerIncludingDeleted(db, row.customerId, workspaceId),
  ])

  return {
    data: {
      ...adminTourOrder(row),
      customer: customer ? { id: customer.id, customerCode: customer.customerCode, name: customer.name, isArchived: !!customer.deletedAt } : null,
      jamaah: jamaahRes.data,
      bookings: bookingsRes.data,
      tripOrders,
    },
  }
})
