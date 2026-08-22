import { useDb } from '~/server/db'
import { getService, updateService } from '~/server/services/catalog'
import { servicePatch } from '~/server/utils/validators'
import { adminService } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, servicePatch.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  if (!(await getService(db, id))) throw createError({ statusCode: 404, statusMessage: 'Layanan tidak ditemukan' })
  const row = await updateService(db, id, body.data)
  return { data: row ? adminService(row) : null }
})
