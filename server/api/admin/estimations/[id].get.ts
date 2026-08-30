import { useDb } from '~/server/db'
import { getEstimation } from '~/server/services/estimation'

/** Read-only: snapshot estimasi tidak bisa diedit. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const e = await getEstimation(useDb(), id)
  if (!e) throw createError({ statusCode: 404, statusMessage: 'Estimasi tidak ditemukan' })
  return {
    data: {
      id: e.id,
      estimationNumber: e.estimationNumber,
      status: e.status,
      pilgrims: e.pilgrims,
      departureCity: e.departureCity,
      departureDate: e.departureDate,
      returnDate: e.returnDate,
      durationDays: e.durationDays,
      makkahNights: e.makkahNights,
      madinahNights: e.madinahNights,
      totalAmount: Number(e.totalAmount),
      currency: e.currency,
      perPersonAmount: e.perPersonAmount === null ? null : Number(e.perPersonAmount),
      submittedAt: e.submittedAt,
      items: e.items.map((it) => ({
        id: it.id,
        category: it.category,
        label: it.label,
        detail: it.detail,
        unit: it.unit,
        unitPrice: it.unitPrice === null ? null : Number(it.unitPrice),
        currency: it.currency,
        quantity: it.quantity === null ? null : Number(it.quantity),
        amount: Number(it.amount),
        meta: it.meta,
      })),
      rates: e.rates.map((r) => ({
        sourceCurrency: r.sourceCurrency,
        targetCurrency: r.targetCurrency,
        rate: Number(r.rate),
        capturedAt: r.capturedAt,
      })),
    },
  }
})
