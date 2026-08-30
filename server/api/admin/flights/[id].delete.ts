import { useDb } from '~/server/db'
import { softDeleteFlight } from '~/server/services/catalog'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const row = await softDeleteFlight(useDb(), id)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Penerbangan tidak ditemukan' })
  return { ok: true }
})
