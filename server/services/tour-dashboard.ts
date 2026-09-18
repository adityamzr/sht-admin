import { and, asc, count, desc, eq, gte, inArray, isNull, ne, or, sql } from 'drizzle-orm'
import type { DbLike } from '../db'
import {
  tourAccommodationStayOrders,
  tourAccommodationStays,
  tourCustomers,
  tourExpenses,
  tourJamaah,
  tourOrders,
  tourPayments,
  tourRoomOccupants,
  tourTripOrders,
  tourTrips,
  tourVendors,
} from '../db/schema'
import { getFinanceOverview } from './tour-finance'
import {
  ACTIVE_ORDER_STATUSES,
  TOUR_DASHBOARD_LIMITS,
  UPCOMING_TRIP_STATUSES,
  addTourDays,
  toTourDateKey,
  tourDaysBetween,
} from '../../shared/tour-dashboard'

type AttentionItem = {
  id: string
  type: 'OVERDUE_INVOICE' | 'BOOKING_DUE' | 'ROOMING' | 'JAMAAH_DATA'
  title: string
  description: string
  meta: string
  tone: 'danger' | 'warning' | 'info'
  to: string
  priority: number
  sortDate: string
}

function notDeleted(table: any) {
  return isNull(table.deletedAt)
}

function todayKey(now: Date) {
  return now.toISOString().slice(0, 10)
}

function numberValue(value: unknown) {
  return Number(value || 0)
}

async function getRoomingByTrip(db: DbLike, workspaceId: number, tripIds: number[]) {
  const result: Record<number, { configured: boolean; assigned: number; eligible: number; incompleteStays: Array<{ id: number; hotelName: string; assigned: number; eligible: number }> }> = {}
  for (const tripId of tripIds) result[tripId] = { configured: false, assigned: 0, eligible: 0, incompleteStays: [] }
  if (!tripIds.length) return result

  const stays = await db.select({ id: tourAccommodationStays.id, tripId: tourAccommodationStays.tripId, hotelName: tourAccommodationStays.hotelName })
    .from(tourAccommodationStays)
    .where(and(eq(tourAccommodationStays.workspaceId, workspaceId), inArray(tourAccommodationStays.tripId, tripIds), notDeleted(tourAccommodationStays)))
  if (!stays.length) return result

  const stayIds = stays.map(stay => stay.id)
  const stayOrders = await db.select({ stayId: tourAccommodationStayOrders.stayId, orderId: tourAccommodationStayOrders.orderId })
    .from(tourAccommodationStayOrders)
    .where(and(eq(tourAccommodationStayOrders.workspaceId, workspaceId), inArray(tourAccommodationStayOrders.stayId, stayIds)))
  const orderIds = [...new Set(stayOrders.map(row => row.orderId))]
  const [jamaahRows, occupantRows] = await Promise.all([
    orderIds.length
      ? db.select({ id: tourJamaah.id, orderId: tourJamaah.orderId }).from(tourJamaah)
        .where(and(eq(tourJamaah.workspaceId, workspaceId), inArray(tourJamaah.orderId, orderIds), notDeleted(tourJamaah)))
      : Promise.resolve([]),
    db.select({ stayId: tourRoomOccupants.stayId, v: count() }).from(tourRoomOccupants)
      .where(and(eq(tourRoomOccupants.workspaceId, workspaceId), inArray(tourRoomOccupants.stayId, stayIds)))
      .groupBy(tourRoomOccupants.stayId),
  ])

  const jamaahCountByOrder: Record<number, number> = {}
  for (const row of jamaahRows) jamaahCountByOrder[row.orderId] = (jamaahCountByOrder[row.orderId] || 0) + 1
  const assignedByStay = Object.fromEntries(occupantRows.map(row => [row.stayId, numberValue(row.v)]))

  for (const stay of stays) {
    const eligible = stayOrders
      .filter(row => row.stayId === stay.id)
      .reduce((total, row) => total + (jamaahCountByOrder[row.orderId] || 0), 0)
    const assigned = assignedByStay[stay.id] || 0
    const trip = result[stay.tripId]
    trip.configured = true
    trip.eligible += eligible
    trip.assigned += assigned
    if (eligible > assigned) trip.incompleteStays.push({ id: stay.id, hotelName: stay.hotelName, assigned, eligible })
  }

  return result
}

async function getRecentFinanceActivity(db: DbLike, workspaceId: number) {
  const limit = TOUR_DASHBOARD_LIMITS.financeActivity
  const [paymentRows, expenseRows] = await Promise.all([
    db.select({
      id: tourPayments.id,
      code: tourPayments.paymentCode,
      date: tourPayments.paymentDate,
      amountIdr: tourPayments.amountIdr,
      customerName: tourCustomers.name,
      orderCode: tourOrders.orderCode,
    }).from(tourPayments)
      .leftJoin(tourOrders, and(eq(tourPayments.orderId, tourOrders.id), eq(tourOrders.workspaceId, workspaceId)))
      .leftJoin(tourCustomers, and(eq(tourOrders.customerId, tourCustomers.id), eq(tourCustomers.workspaceId, workspaceId)))
      .where(and(eq(tourPayments.workspaceId, workspaceId), eq(tourPayments.status, 'VERIFIED'), notDeleted(tourPayments)))
      .orderBy(desc(tourPayments.paymentDate), desc(tourPayments.createdAt)).limit(limit),
    db.select({
      id: tourExpenses.id,
      code: tourExpenses.expenseCode,
      date: tourExpenses.expenseDate,
      amountIdr: tourExpenses.amountIdr,
      currency: tourExpenses.currency,
      amount: tourExpenses.amount,
      description: tourExpenses.description,
      vendorName: tourVendors.name,
    }).from(tourExpenses)
      .leftJoin(tourVendors, and(eq(tourExpenses.vendorId, tourVendors.id), eq(tourVendors.workspaceId, workspaceId)))
      .where(and(eq(tourExpenses.workspaceId, workspaceId), eq(tourExpenses.status, 'VERIFIED'), notDeleted(tourExpenses)))
      .orderBy(desc(tourExpenses.expenseDate), desc(tourExpenses.createdAt)).limit(limit),
  ])

  return [
    ...paymentRows.map(row => ({
      id: `payment-${row.id}`,
      type: 'PAYMENT' as const,
      code: row.code,
      date: toTourDateKey(row.date),
      amountIdr: numberValue(row.amountIdr),
      originalAmount: null,
      originalCurrency: null,
      context: row.customerName || row.orderCode || 'Pembayaran pelanggan',
      to: '/tour/finance/payments',
    })),
    ...expenseRows.map(row => ({
      id: `expense-${row.id}`,
      type: 'EXPENSE' as const,
      code: row.code,
      date: toTourDateKey(row.date),
      amountIdr: numberValue(row.amountIdr),
      originalAmount: row.currency === 'IDR' ? null : numberValue(row.amount),
      originalCurrency: row.currency === 'IDR' ? null : row.currency,
      context: row.vendorName || row.description || 'Pengeluaran operasional',
      to: '/tour/finance/expenses',
    })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, limit)
}

export async function getTourOperationalDashboard(db: DbLike, workspaceId: number, now = new Date()) {
  const today = todayKey(now)
  const upcomingWhere = and(
    eq(tourTrips.workspaceId, workspaceId),
    notDeleted(tourTrips),
    gte(tourTrips.departureDate, today as any),
    or(...UPCOMING_TRIP_STATUSES.map(status => eq(tourTrips.status, status))),
  )
  const activeOrderWhere = and(
    eq(tourOrders.workspaceId, workspaceId),
    notDeleted(tourOrders),
    or(...ACTIVE_ORDER_STATUSES.map(status => eq(tourOrders.status, status))),
  )

  const [activeOrderRows, upcomingCountRows, upcomingTripRows, recentOrderRows, finance, incompleteOrderRows] = await Promise.all([
    db.select({ count: count(), pax: sql<number>`coalesce(sum(${tourOrders.paxCount}), 0)` }).from(tourOrders).where(activeOrderWhere),
    db.select({ count: count() }).from(tourTrips).where(upcomingWhere),
    db.select().from(tourTrips).where(upcomingWhere)
      .orderBy(asc(tourTrips.departureDate), asc(tourTrips.id)).limit(TOUR_DASHBOARD_LIMITS.upcomingTrips),
    db.select({
      id: tourOrders.id,
      orderCode: tourOrders.orderCode,
      orderDate: tourOrders.orderDate,
      createdAt: tourOrders.createdAt,
      packageName: tourOrders.packageName,
      serviceSummary: tourOrders.serviceSummary,
      orderType: tourOrders.orderType,
      paxCount: tourOrders.paxCount,
      sellingPriceIdr: tourOrders.sellingPriceIdr,
      status: tourOrders.status,
      customerName: tourCustomers.name,
    }).from(tourOrders)
      .leftJoin(tourCustomers, and(eq(tourOrders.customerId, tourCustomers.id), eq(tourCustomers.workspaceId, workspaceId)))
      .where(and(eq(tourOrders.workspaceId, workspaceId), notDeleted(tourOrders)))
      .orderBy(desc(tourOrders.createdAt), desc(tourOrders.id)).limit(TOUR_DASHBOARD_LIMITS.recentOrders),
    getFinanceOverview(db, workspaceId),
    db.select({
      id: tourOrders.id,
      orderCode: tourOrders.orderCode,
      paxCount: tourOrders.paxCount,
      jamaahCount: count(tourJamaah.id),
    }).from(tourOrders)
      .leftJoin(tourJamaah, and(eq(tourJamaah.orderId, tourOrders.id), eq(tourJamaah.workspaceId, workspaceId), notDeleted(tourJamaah)))
      .where(activeOrderWhere)
      .groupBy(tourOrders.id, tourOrders.orderCode, tourOrders.paxCount, tourOrders.orderDate)
      .having(sql`count(${tourJamaah.id}) < ${tourOrders.paxCount}`)
      .orderBy(desc(tourOrders.orderDate)).limit(5),
  ])

  const tripIds = upcomingTripRows.map(trip => trip.id)
  const tripOrderRows = tripIds.length
    ? await db.select({ tripId: tourTripOrders.tripId, orderId: tourOrders.id, paxCount: tourOrders.paxCount })
      .from(tourTripOrders)
      .innerJoin(tourOrders, and(
        eq(tourTripOrders.orderId, tourOrders.id),
        eq(tourOrders.workspaceId, workspaceId),
        notDeleted(tourOrders),
        ne(tourOrders.status, 'CANCELLED'),
      ))
      .where(and(eq(tourTripOrders.workspaceId, workspaceId), inArray(tourTripOrders.tripId, tripIds)))
    : []

  let roomingByTrip: Awaited<ReturnType<typeof getRoomingByTrip>> = {}
  let financeActivity: Awaited<ReturnType<typeof getRecentFinanceActivity>> = []
  const warnings: string[] = []
  try {
    roomingByTrip = await getRoomingByTrip(db, workspaceId, tripIds)
  } catch {
    warnings.push('ROOMING_UNAVAILABLE')
  }
  try {
    financeActivity = await getRecentFinanceActivity(db, workspaceId)
  } catch {
    warnings.push('FINANCE_ACTIVITY_UNAVAILABLE')
  }

  const upcomingTrips = upcomingTripRows.map(trip => {
    const linkedOrders = tripOrderRows.filter(row => row.tripId === trip.id)
    const rooming = roomingByTrip[trip.id] || { configured: false, assigned: 0, eligible: 0, incompleteStays: [] }
    return {
      id: trip.id,
      tripCode: trip.tripCode,
      name: trip.name,
      departureDate: toTourDateKey(trip.departureDate),
      daysUntilDeparture: tourDaysBetween(today, toTourDateKey(trip.departureDate) || today),
      capacity: trip.capacity,
      totalPax: linkedOrders.reduce((total, row) => total + numberValue(row.paxCount), 0),
      ordersCount: linkedOrders.length,
      status: trip.status,
      rooming: {
        configured: rooming.configured,
        assigned: rooming.assigned,
        eligible: rooming.eligible,
        complete: rooming.configured && rooming.eligible > 0 && rooming.assigned >= rooming.eligible,
      },
      to: `/tour/trips/${trip.id}`,
    }
  })

  const overdueOrderIds = [...new Set(finance.overdueInvoices.map(invoice => invoice.orderId).filter(Boolean))]
  const overdueContexts = overdueOrderIds.length
    ? await db.select({ orderId: tourOrders.id, orderCode: tourOrders.orderCode, customerName: tourCustomers.name })
      .from(tourOrders)
      .leftJoin(tourCustomers, and(eq(tourOrders.customerId, tourCustomers.id), eq(tourCustomers.workspaceId, workspaceId)))
      .where(and(eq(tourOrders.workspaceId, workspaceId), inArray(tourOrders.id, overdueOrderIds)))
    : []
  const overdueContextByOrder = Object.fromEntries(overdueContexts.map(row => [row.orderId, row]))

  const attention: AttentionItem[] = []
  for (const invoice of finance.overdueInvoices) {
    const context = overdueContextByOrder[invoice.orderId]
    attention.push({
      id: `overdue-${invoice.id}`,
      type: 'OVERDUE_INVOICE',
      title: invoice.invoiceCode,
      description: context?.customerName || context?.orderCode || `Order #${invoice.orderId}`,
      meta: `Outstanding Rp ${numberValue(invoice.outstanding).toLocaleString('id-ID')} · overdue ${invoice.daysOverdue} hari`,
      tone: 'danger',
      to: '/tour/finance/invoices',
      priority: 1,
      sortDate: toTourDateKey(invoice.dueDate) || today,
    })
  }

  const bookingDueLimit = addTourDays(today, 7)
  for (const booking of finance.upcomingBookings) {
    const dueDate = toTourDateKey(booking.dueDate)
    if (!dueDate || dueDate > bookingDueLimit) continue
    const dueIn = tourDaysBetween(today, dueDate)
    attention.push({
      id: `booking-${booking.id}`,
      type: 'BOOKING_DUE',
      title: booking.bookingCode,
      description: booking.vendor?.name || booking.description || booking.bookingType,
      meta: dueIn === 0 ? 'Jatuh tempo hari ini' : `Jatuh tempo ${dueIn} hari lagi`,
      tone: dueIn <= 1 ? 'danger' : 'warning',
      to: `/tour/bookings/${booking.id}`,
      priority: 3,
      sortDate: dueDate,
    })
  }

  for (const trip of upcomingTrips) {
    const source = roomingByTrip[trip.id]
    if (!source?.incompleteStays.length || trip.daysUntilDeparture > 30) continue
    for (const stay of source.incompleteStays) {
      attention.push({
        id: `rooming-${stay.id}`,
        type: 'ROOMING',
        title: `${trip.tripCode} · ${stay.hotelName}`,
        description: 'Rooming belum lengkap',
        meta: `${stay.assigned} / ${stay.eligible} jamaah teralokasi`,
        tone: trip.daysUntilDeparture <= 7 ? 'danger' : 'warning',
        to: trip.to,
        priority: 2,
        sortDate: trip.departureDate || today,
      })
    }
  }

  for (const order of incompleteOrderRows) {
    attention.push({
      id: `jamaah-${order.id}`,
      type: 'JAMAAH_DATA',
      title: order.orderCode,
      description: 'Data jamaah belum lengkap',
      meta: `${numberValue(order.jamaahCount)} / ${order.paxCount} jamaah terdaftar`,
      tone: 'info',
      to: `/tour/orders/${order.id}`,
      priority: 4,
      sortDate: today,
    })
  }

  attention.sort((a, b) => a.priority - b.priority || a.sortDate.localeCompare(b.sortDate))

  // Leads are intentionally omitted: the legacy leads table has no workspaceId,
  // so including it would violate server-side workspace isolation.
  return {
    generatedAt: now.toISOString(),
    kpis: {
      activeOrders: numberValue(activeOrderRows[0]?.count),
      activePax: numberValue(activeOrderRows[0]?.pax),
      upcomingTrips: numberValue(upcomingCountRows[0]?.count),
      outstandingReceivables: numberValue(finance.outstandingReceivables),
      overdueInvoices: numberValue(finance.overdueInvoicesCount),
      currentCashPosition: numberValue(finance.currentCashPosition),
    },
    upcomingTrips,
    attention: attention.slice(0, TOUR_DASHBOARD_LIMITS.attention).map(({ priority: _priority, sortDate: _sortDate, ...item }) => item),
    recentOrders: recentOrderRows.map(order => ({
      ...order,
      orderDate: toTourDateKey(order.orderDate),
      createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : String(order.createdAt),
      sellingPriceIdr: numberValue(order.sellingPriceIdr),
    })),
    financeActivity,
    warnings,
  }
}
