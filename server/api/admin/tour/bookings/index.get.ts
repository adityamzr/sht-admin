import { useDb } from '~/server/db'
import { listTourBookingsEnriched, getTourWorkspaceId } from '~/server/services/tour-operations'
import { adminTourBooking } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const result = await listTourBookingsEnriched(db, {
    workspaceId,
    search: typeof q.search === 'string' ? q.search.trim() : undefined,
    status: typeof q.status === 'string' ? q.status : undefined,
    bookingType: typeof q.bookingType === 'string' ? q.bookingType : undefined,
    vendorId: q.vendorId ? Number(q.vendorId) : undefined,
    tripId: q.tripId ? Number(q.tripId) : undefined,
    orderId: q.orderId ? Number(q.orderId) : undefined,
    page: Number(q.page) || 1,
    pageSize: Number(q.pageSize) || 20,
  })
  return {
    data: result.data.map((r: any) => ({
      ...adminTourBooking(r as any),
      vendor: r.vendor,
      trip: r.trip,
      order: r.order,
      customer: r.customer,
    })),
    meta: { page: result.page, pageSize: result.pageSize, total: result.total, pageCount: Math.ceil(result.total / result.pageSize) },
  }
})
