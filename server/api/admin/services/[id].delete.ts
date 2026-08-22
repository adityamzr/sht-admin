import { useDb } from '~/server/db'
import { softDeleteService } from '~/server/services/catalog'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const row = await softDeleteService(useDb(), id)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Layanan tidak ditemukan' })
  return { ok: true }
})
