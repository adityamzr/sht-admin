import { useDb } from '~/server/db'
import { softDeleteRoomType } from '~/server/services/catalog'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const row = await softDeleteRoomType(useDb(), id)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Tipe kamar tidak ditemukan' })
  return { ok: true }
})
