import { useDb } from '~/server/db'
import { getTourBooking, updateTourBooking, getTourWorkspaceId, getTourVendor, getTourTrip, getTourOrder } from '~/server/services/tour-operations'
import { tourBookingPatch } from '~/server/utils/tour-validators'
import { adminTourBooking } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, tourBookingPatch.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const existing = await getTourBooking(db, id, workspaceId)
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Booking tidak ditemukan' })

  if (body.data.vendorId) {
    const vendor = await getTourVendor(db, body.data.vendorId, workspaceId)
    if (!vendor) throw createError({ statusCode: 400, statusMessage: 'Vendor tidak ditemukan' })
  }
  if (body.data.tripId) {
    const trip = await getTourTrip(db, body.data.tripId, workspaceId)
    if (!trip) throw createError({ statusCode: 400, statusMessage: 'Trip tidak ditemukan' })
  }
  if (body.data.orderId) {
    const order = await getTourOrder(db, body.data.orderId, workspaceId)
    if (!order) throw createError({ statusCode: 400, statusMessage: 'Order tidak ditemukan' })
  }

  // Recompute amountIdr if needed
  let patch: any = { ...body.data }
  if (body.data.amount !== undefined || body.data.currency !== undefined || body.data.exchangeRateSnapshot !== undefined || body.data.amountIdr !== undefined) {
    const currency = body.data.currency ?? existing.currency
    const amount = body.data.amount ?? Number(existing.amount)
    const snapshot = body.data.exchangeRateSnapshot ?? (existing.exchangeRateSnapshot ? Number(existing.exchangeRateSnapshot) : null)
    if (currency === 'IDR') {
      patch.amountIdr = amount
    } else if (snapshot) {
      patch.amountIdr = amount * snapshot
    }
  }

  const row = await updateTourBooking(db, id, workspaceId, patch)
  return { data: row ? adminTourBooking(row) : null }
})
