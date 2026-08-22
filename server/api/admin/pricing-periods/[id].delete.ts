import { eq } from 'drizzle-orm'
import { pricingPeriods } from '~/server/db/schema'
import { useDb } from '~/server/db'

/** Arsip (nonaktif) — periode yang direferensikan pricing record tidak dihapus hard. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const updated = await db
    .update(pricingPeriods)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(pricingPeriods.id, id))
    .returning({ id: pricingPeriods.id })
  if (!updated[0]) throw createError({ statusCode: 404, statusMessage: 'Periode tidak ditemukan' })
  return { ok: true }
})
