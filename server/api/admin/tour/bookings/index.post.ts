import { useDb } from '~/server/db'
import { createTourBooking, getTourWorkspaceId, getTourVendor, getTourTrip, getTourOrder } from '~/server/services/tour-operations'
import { tourBookingInput } from '~/server/utils/tour-validators'
import { adminTourBooking } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, tourBookingInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)

  const vendor = await getTourVendor(db, body.data.vendorId, workspaceId)
  if (!vendor) throw createError({ statusCode: 400, statusMessage: 'Vendor tidak ditemukan' })

  if (body.data.tripId) {
    const trip = await getTourTrip(db, body.data.tripId, workspaceId)
    if (!trip) throw createError({ statusCode: 400, statusMessage: 'Trip tidak ditemukan' })
  }
  if (body.data.orderId) {
    const order = await getTourOrder(db, body.data.orderId, workspaceId)
    if (!order) throw createError({ statusCode: 400, statusMessage: 'Order tidak ditemukan' })
  }

  // Server-authoritative amountIdr
  const currency = body.data.currency
  const amount = Number(body.data.amount)
  let exchangeRateSnapshot: number | null = body.data.exchangeRateSnapshot !== undefined && body.data.exchangeRateSnapshot !== null ? Number(body.data.exchangeRateSnapshot) : null
  let amountIdr: number

  if (currency === 'IDR') {
    exchangeRateSnapshot = null
    amountIdr = amount
  } else {
    if (!exchangeRateSnapshot || exchangeRateSnapshot <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'exchangeRateSnapshot wajib >0 untuk non-IDR' })
    }
    amountIdr = amount * exchangeRateSnapshot
  }

  const row = await createTourBooking(db, workspaceId, { ...body.data, exchangeRateSnapshot, amountIdr })
  return { data: adminTourBooking(row) }
})
