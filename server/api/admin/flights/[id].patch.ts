import { useDb } from '~/server/db'
import { getFlight, updateFlight } from '~/server/services/catalog'
import { flightPatch } from '~/server/utils/validators'
import { adminFlight } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, flightPatch.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  if (!(await getFlight(db, id))) throw createError({ statusCode: 404, statusMessage: 'Penerbangan tidak ditemukan' })
  const row = await updateFlight(db, id, body.data)
  return { data: row ? adminFlight(row) : null }
})
