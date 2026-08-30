import { useDb } from '~/server/db'
import { updateRouteVehicle } from '~/server/services/catalog'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const row = await updateRouteVehicle(useDb(), id, { isActive: false })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Opsi rute-kendaraan tidak ditemukan' })
  return { ok: true }
})
