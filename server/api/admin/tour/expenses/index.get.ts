import { useDb } from '~/server/db'
import { listTourExpensesEnriched, getTourWorkspaceIdFinance } from '~/server/services/tour-finance'
import { adminTourExpense } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdFinance(db)
  const result = await listTourExpensesEnriched(db, {
    workspaceId,
    search: typeof q.search === 'string' ? q.search.trim() : undefined,
    status: typeof q.status === 'string' ? q.status : undefined,
    category: typeof q.category === 'string' ? q.category : undefined,
    orderId: q.orderId ? Number(q.orderId) : undefined,
    tripId: q.tripId ? Number(q.tripId) : undefined,
    vendorId: q.vendorId ? Number(q.vendorId) : undefined,
    bookingId: q.bookingId ? Number(q.bookingId) : undefined,
    page: Number(q.page) || 1,
    pageSize: Number(q.pageSize) || 20,
  })
  return {
    data: result.data.map((r: any) => ({
      ...adminTourExpense(r as any),
      order: r.order,
      customer: r.customer,
      trip: r.trip,
      vendor: r.vendor,
      booking: r.booking,
    })),
    meta: { page: result.page, pageSize: result.pageSize, total: result.total, pageCount: Math.ceil(result.total / result.pageSize) },
  }
})
