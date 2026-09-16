import { useDb } from '~/server/db'
import { getTourOrder, getTourCustomerIncludingDeleted, getTourWorkspaceId, listTourJamaah, listTourBookings, listTripOrdersEnriched } from '~/server/services/tour-operations'
import { listTourInvoicesEnriched, listTourPaymentsEnriched, listTourExpensesEnriched } from '~/server/services/tour-finance'
import { adminTourOrder } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const row = await getTourOrder(db, id, workspaceId)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Order tidak ditemukan' })

  // Fetch linked data for operational center view — include archived customer
  const [jamaahRes, bookingsRes, tripOrders, customer, invoicesRes, paymentsRes, expensesRes] = await Promise.all([
    listTourJamaah(db, { workspaceId, orderId: id, page: 1, pageSize: 100 }),
    listTourBookings(db, { workspaceId, orderId: id, page: 1, pageSize: 100 }),
    listTripOrdersEnriched(db, workspaceId, undefined, id),
    getTourCustomerIncludingDeleted(db, row.customerId, workspaceId),
    listTourInvoicesEnriched(db, { workspaceId, orderId: id, page: 1, pageSize: 100 }).catch(() => ({ data: [] })),
    listTourPaymentsEnriched(db, { workspaceId, orderId: id, page: 1, pageSize: 100 }).catch(() => ({ data: [] })),
    listTourExpensesEnriched(db, { workspaceId, orderId: id, page: 1, pageSize: 100 }).catch(() => ({ data: [] })),
  ])

  // Finance summary derived
  const orderValue = Number(row.sellingPriceIdr ?? 0)
  const invoices = (invoicesRes as any).data ?? []
  const totalInvoiced = invoices.filter((i: any) => i.state !== 'CANCELLED').reduce((s: number, i: any) => s + Number(i.amountIdr ?? 0), 0)
  const payments = (paymentsRes as any).data ?? []
  const verifiedPayments = payments.filter((p: any) => p.status === 'VERIFIED').reduce((s: number, p: any) => s + Number(p.amountIdr ?? 0), 0)
  const totalOutstanding = invoices.filter((i: any) => i.state !== 'CANCELLED').reduce((s: number, i: any) => s + Number(i.outstanding ?? 0), 0)

  return {
    data: {
      ...adminTourOrder(row),
      customer: customer ? { id: customer.id, customerCode: customer.customerCode, name: customer.name, isArchived: !!customer.deletedAt } : null,
      jamaah: jamaahRes.data,
      bookings: bookingsRes.data,
      tripOrders,
      finance: {
        orderValue,
        totalInvoiced,
        verifiedPayments,
        outstanding: totalOutstanding,
        invoices,
        payments,
        expenses: (expensesRes as any).data ?? [],
      },
    },
  }
})
