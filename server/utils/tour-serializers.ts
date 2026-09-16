import type {
  tourCustomers,
  tourOrders,
  tourJamaah,
  tourTrips,
  tourVendors,
  tourBookings,
  tourTripOrders,
} from '../db/schema'

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null
  return typeof v === 'string' ? Number(v) : Number(v)
}

function toDateString(d: unknown): string | null {
  if (!d) return null
  if (d instanceof Date) return d.toISOString().slice(0, 10)
  return String(d).slice(0, 10)
}

type CustomerRow = typeof tourCustomers.$inferSelect
export function adminTourCustomer(r: CustomerRow) {
  return {
    id: r.id,
    workspaceId: r.workspaceId,
    customerCode: r.customerCode,
    name: r.name,
    whatsapp: r.whatsapp,
    email: r.email,
    city: r.city,
    customerType: r.customerType,
    source: r.source,
    picUserId: r.picUserId,
    notes: r.notes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

type OrderRow = typeof tourOrders.$inferSelect
export function adminTourOrder(r: OrderRow) {
  return {
    id: r.id,
    workspaceId: r.workspaceId,
    orderCode: r.orderCode,
    orderDate: toDateString(r.orderDate),
    customerId: r.customerId,
    leadId: r.leadId,
    estimationId: r.estimationId,
    orderType: r.orderType,
    packageName: r.packageName,
    serviceSummary: r.serviceSummary,
    paxCount: r.paxCount,
    status: r.status,
    sellingPriceIdr: toNumber(r.sellingPriceIdr),
    picUserId: r.picUserId,
    source: r.source,
    notes: r.notes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

type JamaahRow = typeof tourJamaah.$inferSelect
export function adminTourJamaah(r: JamaahRow) {
  return {
    id: r.id,
    workspaceId: r.workspaceId,
    jamaahCode: r.jamaahCode,
    orderId: r.orderId,
    fullName: r.fullName,
    gender: r.gender,
    birthDate: toDateString(r.birthDate),
    passportNumber: r.passportNumber,
    passportExpiry: toDateString(r.passportExpiry),
    visaStatus: r.visaStatus,
    siskopatuhStatus: r.siskopatuhStatus,
    roomType: r.roomType,
    whatsapp: r.whatsapp,
    notes: r.notes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

type TripRow = typeof tourTrips.$inferSelect
export function adminTourTrip(r: TripRow) {
  return {
    id: r.id,
    workspaceId: r.workspaceId,
    tripCode: r.tripCode,
    name: r.name,
    departureDate: toDateString(r.departureDate),
    returnDate: toDateString(r.returnDate),
    routeSummary: r.routeSummary,
    capacity: r.capacity,
    status: r.status,
    picUserId: r.picUserId,
    notes: r.notes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

type VendorRow = typeof tourVendors.$inferSelect
export function adminTourVendor(r: VendorRow) {
  return {
    id: r.id,
    workspaceId: r.workspaceId,
    vendorCode: r.vendorCode,
    name: r.name,
    vendorType: r.vendorType,
    contactName: r.contactName,
    whatsapp: r.whatsapp,
    email: r.email,
    city: r.city,
    country: r.country,
    defaultCurrency: r.defaultCurrency,
    paymentInfo: r.paymentInfo,
    status: r.status,
    notes: r.notes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

type BookingRow = typeof tourBookings.$inferSelect
export function adminTourBooking(r: BookingRow) {
  return {
    id: r.id,
    workspaceId: r.workspaceId,
    bookingCode: r.bookingCode,
    bookingDate: toDateString(r.bookingDate),
    tripId: r.tripId,
    orderId: r.orderId,
    vendorId: r.vendorId,
    bookingType: r.bookingType,
    description: r.description,
    currency: r.currency,
    amount: toNumber(r.amount),
    exchangeRateSnapshot: toNumber(r.exchangeRateSnapshot),
    amountIdr: toNumber(r.amountIdr),
    status: r.status,
    dueDate: toDateString(r.dueDate),
    notes: r.notes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

type TripOrderRow = typeof tourTripOrders.$inferSelect
export function adminTourTripOrder(r: TripOrderRow) {
  return {
    id: r.id,
    workspaceId: r.workspaceId,
    tripId: r.tripId,
    orderId: r.orderId,
    createdAt: r.createdAt,
  }
}
