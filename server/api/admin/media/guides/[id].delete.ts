import { deleteGuide } from '~/server/services/guides'
import { useDb } from '~/server/db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const deleted = await deleteGuide(useDb(), id)
  if (!deleted) throw createError({ statusCode: 404, statusMessage: 'Panduan tidak ditemukan.' })
  return { ok: true, id: deleted.id }
})
