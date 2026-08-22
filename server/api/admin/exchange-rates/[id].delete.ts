import { eq } from 'drizzle-orm'
import { exchangeRates } from '~/server/db/schema'
import { useDb } from '~/server/db'

/** Nonaktifkan kurs (bukan hapus hard — histori tetap tersedia). */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const rows = await db.update(exchangeRates).set({ isActive: false, updatedAt: new Date() }).where(eq(exchangeRates.id, id)).returning({ id: exchangeRates.id })
  if (!rows[0]) throw createError({ statusCode: 404, statusMessage: 'Kurs tidak ditemukan' })
  return { ok: true }
})
