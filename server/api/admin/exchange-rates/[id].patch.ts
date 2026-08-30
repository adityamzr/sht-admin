import { eq } from 'drizzle-orm'
import { exchangeRates } from '~/server/db/schema'
import { useDb } from '~/server/db'
import { exchangeRatePatch } from '~/server/utils/validators'
import { adminExchangeRate } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, exchangeRatePatch.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const patch: Record<string, unknown> = { ...body.data, updatedAt: new Date() }
  if (body.data.rate !== undefined) patch.rate = String(body.data.rate)
  const rows = await db_update(patch)
  return { data: adminExchangeRate(rows) }

  async function db_update(p: Record<string, unknown>) {
    const db = useDb()
    const updated = await db.update(exchangeRates).set(p as never).where(eq(exchangeRates.id, id)).returning()
    if (!updated[0]) throw createError({ statusCode: 404, statusMessage: 'Kurs tidak ditemukan' })
    return updated[0]
  }
})
