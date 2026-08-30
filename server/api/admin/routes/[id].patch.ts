import { useDb } from '~/server/db'
import { getRoute, updateRoute } from '~/server/services/catalog'
import { routePatch } from '~/server/utils/validators'
import { adminRoute } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, routePatch.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  if (!(await getRoute(db, id))) throw createError({ statusCode: 404, statusMessage: 'Rute tidak ditemukan' })
  const row = await updateRoute(db, id, body.data)
  return { data: row ? adminRoute(row) : null }
})
