import { z } from 'zod'
import {
  TOUR_CUSTOMER_TYPES,
  TOUR_CUSTOMER_SOURCES,
  TOUR_ORDER_TYPES,
  TOUR_ORDER_STATUSES,
  TOUR_VISA_STATUSES,
  TOUR_SISKOPATUH_STATUSES,
  TOUR_ROOM_TYPES,
  TOUR_TRIP_STATUSES,
  TOUR_VENDOR_TYPES,
  TOUR_VENDOR_STATUSES,
  TOUR_BOOKING_TYPES,
  TOUR_BOOKING_STATUSES,
  TOUR_GENDERS,
  CURRENCIES,
  TOUR_INVOICE_STATES,
  TOUR_PAYMENT_STATUSES,
  TOUR_PAYMENT_METHODS,
  TOUR_EXPENSE_CATEGORIES,
  TOUR_EXPENSE_STATUSES,
} from '../db/schema'

const int = (min: number, max: number) => z.number().int().min(min).max(max)
const numStr = z.coerce.number()
const isoDate = z.coerce.date()
const optionalDate = z.preprocess((v) => (v === '' || v === null ? null : v), z.coerce.date().nullable().optional())

// ─── Customers ──────────────────────────────────────────────────────────────
export const tourCustomerInput = z.object({
  name: z.string().min(2).max(150),
  whatsapp: z.string().min(8).max(20),
  email: z.string().email().max(255).nullable().optional().or(z.literal('')),
  city: z.string().max(100).nullable().optional(),
  customerType: z.enum(TOUR_CUSTOMER_TYPES),
  source: z.enum(TOUR_CUSTOMER_SOURCES),
  picUserId: z.number().int().positive().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

export const tourCustomerPatch = tourCustomerInput.partial()

// ─── Orders ─────────────────────────────────────────────────────────────────
export const tourOrderInput = z.object({
  orderDate: isoDate,
  customerId: int(1, 999999999),
  leadId: int(1, 999999999).nullable().optional(),
  estimationId: int(1, 999999999).nullable().optional(),
  orderType: z.enum(TOUR_ORDER_TYPES),
  packageName: z.string().max(200).nullable().optional(),
  serviceSummary: z.string().max(2000).default(''),
  paxCount: int(1, 1000),
  status: z.enum(TOUR_ORDER_STATUSES),
  sellingPriceIdr: numStr.min(0),
  picUserId: z.number().int().positive().nullable().optional(),
  source: z.string().max(100).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

export const tourOrderPatch = tourOrderInput.partial()

// ─── Jamaah ─────────────────────────────────────────────────────────────────
export const tourJamaahInput = z.object({
  orderId: int(1, 999999999),
  fullName: z.string().min(2).max(150),
  gender: z.enum(TOUR_GENDERS).nullable().optional(),
  birthDate: optionalDate,
  passportNumber: z.string().max(50).nullable().optional(),
  passportExpiry: optionalDate,
  visaStatus: z.enum(TOUR_VISA_STATUSES),
  siskopatuhStatus: z.enum(TOUR_SISKOPATUH_STATUSES),
  roomType: z.enum(TOUR_ROOM_TYPES),
  whatsapp: z.string().max(20).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

export const tourJamaahPatch = tourJamaahInput.partial().omit({ orderId: true }).extend({ orderId: int(1, 999999999).optional() })

// ─── Trips ──────────────────────────────────────────────────────────────────
export const tourTripInput = z.object({
  name: z.string().min(2).max(200),
  departureDate: isoDate,
  returnDate: isoDate,
  routeSummary: z.string().max(1000).default(''),
  capacity: int(1, 5000),
  status: z.enum(TOUR_TRIP_STATUSES),
  picUserId: z.number().int().positive().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
}).refine((v) => v.returnDate.getTime() >= v.departureDate.getTime(), { message: 'returnDate harus >= departureDate', path: ['returnDate'] })

export const tourTripPatch = z.object({
  name: z.string().min(2).max(200).optional(),
  departureDate: isoDate.optional(),
  returnDate: isoDate.optional(),
  routeSummary: z.string().max(1000).optional(),
  capacity: int(1, 5000).optional(),
  status: z.enum(TOUR_TRIP_STATUSES).optional(),
  picUserId: z.number().int().positive().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
}).refine((v) => !v.departureDate || !v.returnDate || v.returnDate.getTime() >= v.departureDate.getTime(), { message: 'returnDate harus >= departureDate', path: ['returnDate'] })

// ─── Trip-Order assignment ──────────────────────────────────────────────────
export const tourTripOrderInput = z.object({
  tripId: int(1, 999999999),
  orderId: int(1, 999999999),
})

// ─── Vendors ────────────────────────────────────────────────────────────────
export const tourVendorInput = z.object({
  name: z.string().min(2).max(200),
  vendorType: z.enum(TOUR_VENDOR_TYPES),
  contactName: z.string().max(150).nullable().optional(),
  whatsapp: z.string().max(20).nullable().optional(),
  email: z.string().email().max(255).nullable().optional().or(z.literal('')),
  city: z.string().max(100).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  defaultCurrency: z.enum(CURRENCIES),
  paymentInfo: z.string().max(2000).nullable().optional(),
  status: z.enum(TOUR_VENDOR_STATUSES),
  notes: z.string().max(2000).nullable().optional(),
})

export const tourVendorPatch = tourVendorInput.partial()

// ─── Bookings ───────────────────────────────────────────────────────────────
const optionalPositiveNumber = z.preprocess((v) => (v === '' || v === undefined || v === null ? null : v), z.coerce.number().positive().nullable().optional())
const optionalNumber = z.preprocess((v) => (v === '' || v === undefined || v === null ? null : v), z.coerce.number().min(0).nullable().optional())

const tourBookingBase = z.object({
  bookingDate: isoDate,
  tripId: int(1, 999999999).nullable().optional(),
  orderId: int(1, 999999999).nullable().optional(),
  vendorId: int(1, 999999999),
  bookingType: z.enum(TOUR_BOOKING_TYPES),
  description: z.string().max(2000).default(''),
  currency: z.enum(CURRENCIES),
  amount: numStr.min(0),
  exchangeRateSnapshot: optionalPositiveNumber,
  amountIdr: optionalNumber,
  status: z.enum(TOUR_BOOKING_STATUSES),
  dueDate: optionalDate,
  notes: z.string().max(2000).nullable().optional(),
})

export const tourBookingInput = tourBookingBase.superRefine((v, ctx) => {
  if (v.currency !== 'IDR' && (v.exchangeRateSnapshot === null || v.exchangeRateSnapshot === undefined)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'exchangeRateSnapshot wajib untuk non-IDR', path: ['exchangeRateSnapshot'] })
  }
  if (v.currency !== 'IDR' && v.exchangeRateSnapshot !== null && v.exchangeRateSnapshot !== undefined && v.exchangeRateSnapshot <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'exchangeRateSnapshot harus > 0', path: ['exchangeRateSnapshot'] })
  }
})

export const tourBookingPatch = tourBookingBase.partial().superRefine((v, ctx) => {
  if (v.currency && v.currency !== 'IDR' && v.exchangeRateSnapshot === undefined) {
    // if patching currency to non-IDR without snapshot, we can't know existing snapshot, so skip strict check here — API will recompute
    // Only validate if snapshot provided and <=0
  }
  if (v.exchangeRateSnapshot !== null && v.exchangeRateSnapshot !== undefined && v.exchangeRateSnapshot <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'exchangeRateSnapshot harus > 0', path: ['exchangeRateSnapshot'] })
  }
})

// ─── Finance: Invoices ──────────────────────────────────────────────────────
const tourInvoiceBase = z.object({
  orderId: int(1, 999999999),
  issueDate: isoDate,
  dueDate: optionalDate,
  description: z.string().max(500).nullable().optional(),
  amountIdr: numStr.min(1),
  state: z.enum(TOUR_INVOICE_STATES).default('DRAFT'),
  notes: z.string().max(2000).nullable().optional(),
})
export const tourInvoiceInput = tourInvoiceBase.refine((v: any) => !v.dueDate || v.dueDate.getTime() >= v.issueDate.getTime(), { message: 'dueDate tidak boleh sebelum issueDate', path: ['dueDate'] })
export const tourInvoicePatch = tourInvoiceBase.partial().refine((v: any) => !v.issueDate || !v.dueDate || v.dueDate.getTime() >= v.issueDate.getTime(), { message: 'dueDate tidak boleh sebelum issueDate', path: ['dueDate'] })

// ─── Finance: Payments ──────────────────────────────────────────────────────
const tourPaymentBase = z.object({
  invoiceId: int(1, 999999999),
  orderId: int(1, 999999999).optional(),
  paymentDate: isoDate,
  amountIdr: numStr.min(1),
  method: z.enum(TOUR_PAYMENT_METHODS).default('BANK_TRANSFER'),
  accountOrChannel: z.string().max(200).nullable().optional(),
  referenceNumber: z.string().max(200).nullable().optional(),
  proofUrl: z.string().max(1000).nullable().optional(),
  status: z.enum(TOUR_PAYMENT_STATUSES).default('DRAFT'),
  notes: z.string().max(2000).nullable().optional(),
})
export const tourPaymentInput = tourPaymentBase
export const tourPaymentPatch = tourPaymentBase.partial()

// ─── Finance: Expenses ──────────────────────────────────────────────────────
const tourExpenseBase = z.object({
  expenseDate: isoDate,
  orderId: int(1, 999999999).nullable().optional(),
  tripId: int(1, 999999999).nullable().optional(),
  bookingId: int(1, 999999999).nullable().optional(),
  vendorId: int(1, 999999999).nullable().optional(),
  category: z.enum(TOUR_EXPENSE_CATEGORIES),
  description: z.string().max(500).default(''),
  currency: z.enum(CURRENCIES).default('IDR'),
  amount: numStr.min(0.01),
  exchangeRateSnapshot: optionalPositiveNumber,
  amountIdr: optionalNumber,
  status: z.enum(TOUR_EXPENSE_STATUSES).default('DRAFT'),
  paymentMethod: z.string().max(100).nullable().optional(),
  referenceNumber: z.string().max(200).nullable().optional(),
  proofUrl: z.string().max(1000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})
export const tourExpenseInput = tourExpenseBase.superRefine((v: any, ctx: any) => {
  if (v.currency !== 'IDR' && (v.exchangeRateSnapshot === null || v.exchangeRateSnapshot === undefined)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'exchangeRateSnapshot wajib untuk non-IDR', path: ['exchangeRateSnapshot'] })
  }
  if (v.currency !== 'IDR' && v.exchangeRateSnapshot !== null && v.exchangeRateSnapshot !== undefined && v.exchangeRateSnapshot <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'exchangeRateSnapshot harus > 0', path: ['exchangeRateSnapshot'] })
  }
})
export const tourExpensePatch = tourExpenseBase.partial().superRefine((v: any, ctx: any) => {
  if (v.exchangeRateSnapshot !== null && v.exchangeRateSnapshot !== undefined && v.exchangeRateSnapshot <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'exchangeRateSnapshot harus > 0', path: ['exchangeRateSnapshot'] })
  }
})
