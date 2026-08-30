import { useDb } from '~/server/db'
import { getVehicle, updateVehicle } from '~/server/services/catalog'
import { vehiclePatch } from '~/server/utils/validators'
import { adminVehicle } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, vehiclePatch.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  if (!(await getVehicle(db, id))) throw createError({ statusCode: 404, statusMessage: 'Kendaraan tidak ditemukan' })
  const row = await updateVehicle(db, id, body.data)
  return { data: row ? adminVehicle(row) : null }
})
