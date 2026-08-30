import { useDb } from '~/server/db'
import { updateRouteVehicle } from '~/server/services/catalog'
import { routeVehiclePatch } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, routeVehiclePatch.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const row = await updateRouteVehicle(useDb(), id, body.data)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Opsi rute-kendaraan tidak ditemukan' })
  return { data: { id: row.id, routeId: row.routeId, vehicleId: row.vehicleId, isActive: row.isActive } }
})
