import { and, eq, ne } from 'drizzle-orm'
import { pricingPeriods } from '~/server/db/schema'
import { useDb } from '~/server/db'
import { pricingPeriodPatch } from '~/server/utils/validators'
import { adminPricingPeriod } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, pricingPeriodPatch.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  if (body.data.priority !== undefined) {
    const clash = await db
      .select()
      .from(pricingPeriods)
      .where(and(eq(pricingPeriods.priority, body.data.priority), ne(pricingPeriods.id, id)))
      .limit(1)
    if (clash.length) throw createError({ statusCode: 409, statusMessage: `Prioritas ${body.data.priority} sudah dipakai periode lain (harus unik).` })
  }
  const patch: Record<string, unknown> = { ...body.data, updatedAt: new Date() }
  if (body.data.startDate !== undefined) patch.startDate = new Date(body.data.startDate)
  if (body.data.endDate !== undefined) patch.endDate = new Date(body.data.endDate)
  const rows = await db.update(pricingPeriods).set(patch as never).where(eq(pricingPeriods.id, id)).returning()
  if (!rows[0]) throw createError({ statusCode: 404, statusMessage: 'Periode tidak ditemukan' })
  return { data: adminPricingPeriod(rows[0]) }
})
