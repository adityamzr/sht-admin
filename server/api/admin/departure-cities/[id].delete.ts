import { useDb } from '~/server/db'
import { softDeleteDepartureCity } from '~/server/services/catalog'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const row = await softDeleteDepartureCity(useDb(), id)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Kota keberangkatan tidak ditemukan' })
  return { ok: true }
})
