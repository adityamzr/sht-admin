import { eq } from 'drizzle-orm'
import { pricingRecords } from '~/server/db/schema'
import { useDb } from '~/server/db'

/** Hapus record harga (aman hard-delete: snapshot estimasi menyimpan salinan sendiri). */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const rows = await db.delete(pricingRecords).where(eq(pricingRecords.id, id)).returning({ id: pricingRecords.id })
  if (!rows[0]) throw createError({ statusCode: 404, statusMessage: 'Pricing record tidak ditemukan' })
  return { ok: true }
})
