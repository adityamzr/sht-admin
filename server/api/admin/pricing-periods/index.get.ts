import { useDb } from '~/server/db'
import { listPeriods } from '~/server/services/pricing'
import { adminPricingPeriod } from '~/server/utils/serializers'

export default defineEventHandler(async () => {
  const rows = await listPeriods(useDb())
  return { data: rows.map(adminPricingPeriod) }
})
