import { eq } from 'drizzle-orm'
import { pricingRecords } from '~/server/db/schema'
import { useDb } from '~/server/db'
import { calculateSellingPrice, type PricingStrategy, type MarkupType } from '~/server/services/pricing'
import { pricingRecordPatch } from '~/server/utils/validators'
import { adminPricingRecord } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, pricingRecordPatch.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const patch: Record<string, unknown> = { ...body.data, updatedAt: new Date() }
  if (body.data.supplierCost !== undefined) patch.supplierCost = body.data.supplierCost === null ? null : String(body.data.supplierCost)
  if (body.data.markupValue !== undefined) patch.markupValue = body.data.markupValue === null ? null : String(body.data.markupValue)
  if (body.data.sellingPrice !== undefined) patch.sellingPrice = body.data.sellingPrice === null ? null : String(body.data.sellingPrice)
  const db = useDb()
  const rows = await db.update(pricingRecords).set(patch as never).where(eq(pricingRecords.id, id)).returning()
  const r = rows[0]
  if (!r) throw createError({ statusCode: 404, statusMessage: 'Pricing record tidak ditemukan' })
  const selling = calculateSellingPrice({
    strategy: r.strategy as PricingStrategy,
    supplierCost: r.supplierCost === null ? null : Number(r.supplierCost),
    markupType: r.markupType as MarkupType | null,
    markupValue: r.markupValue === null ? null : Number(r.markupValue),
    sellingPrice: r.sellingPrice === null ? null : Number(r.sellingPrice),
  })
  return { data: adminPricingRecord(r, selling) }
})
