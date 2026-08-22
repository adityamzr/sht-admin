import { eq } from 'drizzle-orm'
import { pricingPeriods } from '~/server/db/schema'
import { useDb } from '~/server/db'
import { pricingPeriodInput } from '~/server/utils/validators'
import { adminPricingPeriod } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, pricingPeriodInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  const clash = await db.select().from(pricingPeriods).where(eq(pricingPeriods.priority, body.data.priority)).limit(1)
  if (clash.length) throw createError({ statusCode: 409, statusMessage: `Prioritas ${body.data.priority} sudah dipakai periode lain (harus unik).` })
  const rows = await db
    .insert(pricingPeriods)
    .values({ ...body.data, startDate: new Date(body.data.startDate), endDate: new Date(body.data.endDate) })
    .returning()
  return { data: adminPricingPeriod(rows[0]) }
})
