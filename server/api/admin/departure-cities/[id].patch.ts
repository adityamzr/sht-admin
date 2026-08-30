import { useDb } from '~/server/db'
import { getDepartureCity, updateDepartureCity } from '~/server/services/catalog'
import { departureCityPatch } from '~/server/utils/validators'
import { adminDepartureCity } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, departureCityPatch.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  if (!(await getDepartureCity(db, id))) throw createError({ statusCode: 404, statusMessage: 'Kota keberangkatan tidak ditemukan' })
  const row = await updateDepartureCity(db, id, body.data)
  return { data: row ? adminDepartureCity(row) : null }
})
