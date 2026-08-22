import { useDb } from '~/server/db'
import { listVehicles } from '~/server/services/catalog'
import { adminVehicle } from '~/server/utils/serializers'

export default defineEventHandler(async () => {
  const rows = await listVehicles(useDb())
  return { data: rows.map(adminVehicle) }
})
