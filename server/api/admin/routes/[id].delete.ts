import { useDb } from '~/server/db'
import { softDeleteRoute } from '~/server/services/catalog'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const row = await softDeleteRoute(useDb(), id)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Rute tidak ditemukan' })
  return { ok: true }
})
