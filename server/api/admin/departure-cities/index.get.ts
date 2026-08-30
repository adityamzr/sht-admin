import { useDb } from '~/server/db'
import { listDepartureCities } from '~/server/services/catalog'
import { adminDepartureCity } from '~/server/utils/serializers'

export default defineEventHandler(async () => {
  const rows = await listDepartureCities(useDb())
  return { data: rows.map(adminDepartureCity) }
})
