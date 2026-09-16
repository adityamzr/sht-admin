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
    if (!trip) throw createError({ statusCode: 404, statusMessage: 'Trip tidak ditemukan' })
  }
  if (body.data.orderId) {
    const order = await getTourOrder(db, body.data.orderId, workspaceId)
    if (!order) throw createError({ statusCode: 400, statusMessage: 'Order tidak ditemukan' })
  }

  // Server-authoritative FX logic
  const finalCurrency = (body.data.currency as string) ?? existing.currency
  const finalAmount = body.data.amount !== undefined ? Number(body.data.amount) : Number(existing.amount)
  const currencyChanged = existing.currency !== finalCurrency
  const snapshotProvided = body.data.exchangeRateSnapshot !== undefined

  let finalSnapshot: number | null = null
  if (snapshotProvided) {
    const v = body.data.exchangeRateSnapshot
    finalSnapshot = v === null ? null : Number(v)
  } else {
    finalSnapshot = existing.exchangeRateSnapshot ? Number(existing.exchangeRateSnapshot) : null
  }

  // Hardening rules
  if (finalCurrency === 'IDR') {
    // IDR must have null snapshot, amountIdr = amount
    finalSnapshot = null
  } else {
    // Non-IDR must have snapshot >0
    if (finalSnapshot === null || finalSnapshot === undefined) {
      throw createError({ statusCode: 400, statusMessage: 'exchangeRateSnapshot wajib untuk non-IDR (final state)' })
    }
    if (finalSnapshot <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'exchangeRateSnapshot harus > 0' })
    }
    // If currency changed between non-IDR, require explicit new snapshot
    if (currencyChanged && existing.currency !== 'IDR' && !snapshotProvided) {
      throw createError({ statusCode: 400, statusMessage: `Currency berubah dari ${existing.currency} ke ${finalCurrency}, wajib kirim exchangeRateSnapshot baru` })
    }
    // If IDR -> non-IDR, also require explicit snapshot
    if (currencyChanged && existing.currency === 'IDR' && !snapshotProvided) {
      throw createError({ statusCode: 400, statusMessage: `Currency berubah dari IDR ke ${finalCurrency}, wajib kirim exchangeRateSnapshot` })
    }
  }

  const finalAmountIdr = finalCurrency === 'IDR' ? finalAmount : finalAmount * (finalSnapshot as number)

  const patch: any = {
    ...body.data,
    currency: finalCurrency,
    amount: finalAmount,
    exchangeRateSnapshot: finalSnapshot,
    amountIdr: finalAmountIdr,
  }
  // Remove any client-provided amountIdr override — server is authoritative
  delete patch.amountIdr
  patch.amountIdr = finalAmountIdr
  patch.exchangeRateSnapshot = finalSnapshot

  const row = await updateTourBooking(db, id, workspaceId, patch)
  return { data: row ? adminTourBooking(row) : null }
})
