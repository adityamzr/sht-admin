import { useDb } from '~/server/db'
import { listFlights } from '~/server/services/catalog'
import { adminFlight } from '~/server/utils/serializers'

export default defineEventHandler(async () => {
  const rows = await listFlights(useDb())
  return { data: rows.map(adminFlight) }
})
