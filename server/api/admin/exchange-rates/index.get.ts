import { useDb } from '~/server/db'
import { listRates } from '~/server/services/pricing'
import { adminExchangeRate } from '~/server/utils/serializers'

export default defineEventHandler(async () => {
  const rows = await listRates(useDb())
  return { data: rows.map(adminExchangeRate) }
})
