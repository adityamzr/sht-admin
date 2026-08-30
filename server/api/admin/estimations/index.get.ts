import { useDb } from '~/server/db'
import { listEstimations } from '~/server/services/estimation'

export default defineEventHandler(async () => {
  const rows = await listEstimations(useDb())
  return {
    data: rows.map((e) => ({
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
    })),
  }
})
