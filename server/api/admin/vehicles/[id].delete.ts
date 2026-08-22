import { useDb } from '~/server/db'
import { softDeleteVehicle } from '~/server/services/catalog'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const row = await softDeleteVehicle(useDb(), id)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Kendaraan tidak ditemukan' })
  return { ok: true }
})
