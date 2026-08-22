import { and, eq } from 'drizzle-orm'
import { exchangeRates } from '~/server/db/schema'
import { useDb } from '~/server/db'
import { exchangeRateInput } from '~/server/utils/validators'
import { adminExchangeRate } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, exchangeRateInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  // Kurs baru untuk pasangan mata uang → nonaktifkan kurs aktif lama (satu kurs aktif per pasangan).
  await db
    .update(exchangeRates)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(exchangeRates.sourceCurrency, body.data.sourceCurrency), eq(exchangeRates.targetCurrency, body.data.targetCurrency), eq(exchangeRates.isActive, true)))
  const rows = await db.insert(exchangeRates).values({ ...body.data, rate: String(body.data.rate) }).returning()
  return { data: adminExchangeRate(rows[0]) }
})
