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

  const [jamaahRes, bookingsRes, tripOrders, customer, invoicesRes, paymentsRes, expensesRes] = await Promise.all([
    listTourJamaah(db, { workspaceId, orderId: id, page: 1, pageSize: 100 }),
    listTourBookings(db, { workspaceId, orderId: id, page: 1, pageSize: 100 }),
    listTripOrdersEnriched(db, workspaceId, undefined, id),
    getTourCustomerIncludingDeleted(db, row.customerId, workspaceId),
    listTourInvoicesEnriched(db, { workspaceId, orderId: id, page: 1, pageSize: 100 }).catch(() => ({ data: [] })),
    listTourPaymentsEnriched(db, { workspaceId, orderId: id, page: 1, pageSize: 100 }).catch(() => ({ data: [] })),
    listTourExpensesEnriched(db, { workspaceId, orderId: id, page: 1, pageSize: 100 }).catch(() => ({ data: [] })),
  ])

  const orderValue = Number(row.sellingPriceIdr ?? 0)
  const invoices = (invoicesRes as any).data ?? []
  // Only ISSUED counts as receivable per hardening
  const activeInvoices = invoices.filter((i: any) => i.state === 'ISSUED')
  const totalInvoiced = activeInvoices.reduce((s: number, i: any) => s + Number(i.amountIdr ?? 0), 0)
  const totalOutstanding = activeInvoices.reduce((s: number, i: any) => s + Number(i.outstanding ?? 0), 0)

  const payments = (paymentsRes as any).data ?? []
  const verifiedPayments = payments.filter((p: any) => p.status === 'VERIFIED').reduce((s: number, p: any) => s + Number(p.amountIdr ?? 0), 0)

  const bookings = (bookingsRes as any).data ?? []
  const committedBookingCost = bookings.reduce((s: number, b: any) => s + Number(b.amountIdr ?? 0), 0)

  const expenses = (expensesRes as any).data ?? []
  const verifiedExpenses = expenses.filter((e: any) => e.status === 'VERIFIED').reduce((s: number, e: any) => s + Number(e.amountIdr ?? 0), 0)

  const expectedDirectMargin = orderValue - committedBookingCost
  const currentCashMargin = verifiedPayments - verifiedExpenses

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
        committedBookingCost,
        verifiedExpenses,
        expectedDirectMargin,
        currentCashMargin,
        invoices,
        payments,
        expenses,
      },
    },
  }
})
