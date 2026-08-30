import { useDb } from '~/server/db'
import { createEstimation } from '~/server/services/estimation'
import { createLead } from '~/server/services/leads'
import { calculateTrip, TripPricingError, TripValidationError } from '~/server/services/estimationEngine'
import { estimationSubmitInput } from '~/server/utils/validators'

/**
 * M3 — SUBMIT ESTIMASI CUSTOMER (PUBLIK).
 *
 * Alur otoritatif & ATOMIS (satu transaksi database):
 *   1. validasi payload (zod — ID + konfigurasi saja, tanpa harga client)
 *   2. validasi aturan bisnis terkunci (backend, bukan frontend)
 *   3. kalkulasi ulang seluruh komponen (tanggal perjalanan = penentu periode)
 *   4. simpan snapshot estimasi immutabel (items + kurs)
 *   5. buat lead origin=estimation (status NEW)
 *   6. kembalikan EST-ID + total otoritatif
 *
 * Bila langkah mana pun gagal → rollback penuh: tidak ada estimasi yatim,
 * tidak ada lead tanpa estimasi, tidak ada snapshot parsial.
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, estimationSubmitInput.safeParse)
  if (!body.success) {
    throw createError({ statusCode: 422, statusMessage: body.error.issues[0]?.message ?? 'Data tidak valid. Periksa kembali isian Anda.' })
  }

  const { contact, trip } = body.data
  const db = useDb()

  try {
    const result = await db.transaction(async (tx) => {
      // Kalkulasi otoritatif — bisa lempar TripValidationError / TripPricingError.
      const calc = await calculateTrip(tx, trip)

      const estimation = await createEstimation(tx, {
        pilgrims: trip.pilgrims,
        departureCity: calc.departureCityName,
        departureDate: trip.departureDate,
        returnDate: calc.returnDate,
        durationDays: trip.durationDays,
        makkahNights: trip.makkahNights,
        madinahNights: trip.madinahNights,
        currency: 'IDR',
        totalAmount: calc.total,
        perPersonAmount: calc.perPerson,
        rates: calc.rates,
        items: calc.items.map((it, i) => ({
          category: it.category,
          label: it.label,
          detail: it.detail ?? null,
          unit: it.unit ?? null,
          unitPrice: it.unitPrice ?? null,
          currency: it.currency,
          quantity: it.quantity ?? null,
          amount: it.amount,
          meta: it.meta ?? {},
          sortOrder: i,
        })),
      })
      if (!estimation) throw new Error('Gagal menyimpan estimasi.')

      const lead = await createLead(tx, {
        name: contact.name.trim(),
        whatsapp: contact.whatsapp,
        email: contact.email ?? null,
        origin: 'estimation',
        source: 'trip-builder',
        estimationId: estimation.id,
        notes: contact.notes ?? null,
      })

      return { estimation, lead, calc }
    })

    return {
      data: {
        estimationNumber: result.estimation.estimationNumber,
        status: result.estimation.status,
        totalAmount: result.calc.total,
        perPersonAmount: result.calc.perPerson,
        currency: 'IDR',
        trip: {
          pilgrims: trip.pilgrims,
          departureCity: result.calc.departureCityName,
          departureDate: trip.departureDate,
          returnDate: result.calc.returnDate,
          durationDays: trip.durationDays,
          makkahNights: trip.makkahNights,
          madinahNights: trip.madinahNights,
          visa: trip.visa,
        },
        items: result.calc.items.map((it) => ({
          category: it.category,
          label: it.label,
          detail: it.detail ?? null,
          unit: it.unit ?? null,
          quantity: it.quantity ?? null,
          amount: it.amount,
        })),
        leadId: result.lead.id,
      },
    }
  } catch (err: unknown) {
    if (err instanceof TripValidationError) {
      throw createError({ statusCode: 422, statusMessage: err.message })
    }
    if (err instanceof TripPricingError) {
      throw createError({ statusCode: 422, statusMessage: err.message })
    }
    throw err
  }
})
