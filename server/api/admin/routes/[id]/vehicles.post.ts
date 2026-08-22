import { useDb } from '~/server/db'
import { getRoute, getVehicle, upsertRouteVehicle } from '~/server/services/catalog'
import { routeVehicleInput } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const routeId = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, routeVehicleInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  if (!(await getRoute(db, routeId))) throw createError({ statusCode: 404, statusMessage: 'Rute tidak ditemukan' })
  if (!(await getVehicle(db, body.data.vehicleId))) throw createError({ statusCode: 404, statusMessage: 'Kendaraan tidak ditemukan' })
  const row = await upsertRouteVehicle(db, routeId, body.data.vehicleId)
  return { data: { id: row.id, routeId: row.routeId, vehicleId: row.vehicleId, isActive: row.isActive } }
})
