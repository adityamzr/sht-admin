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

  // Compute amountIdr if not provided? Input requires amountIdr, but we trust client for now. In real, compute from exchange snapshot.
  // For currency snapshot, if currency != IDR and exchangeRateSnapshot missing, already validated.
  // Ensure amountIdr computed correctly: if currency == IDR, amountIdr = amount, else amount * snapshot
  let amountIdr = body.data.amountIdr
  if (body.data.currency === 'IDR') {
    amountIdr = body.data.amount
  } else if (body.data.exchangeRateSnapshot) {
    amountIdr = Number(body.data.amount) * Number(body.data.exchangeRateSnapshot)
  }

  const row = await createTourBooking(db, workspaceId, { ...body.data, amountIdr })
  return { data: adminTourBooking(row) }
})
