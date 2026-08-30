import { useDb } from '~/server/db'
import { softDeleteHotel } from '~/server/services/catalog'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const row = await softDeleteHotel(useDb(), id)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Hotel tidak ditemukan' })
  return { ok: true }
})
