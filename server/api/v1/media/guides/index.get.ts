import { listGuides } from '~/server/services/guides'
import { publicGuide } from '~/server/utils/serializers'
import { useDb } from '~/server/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const rawLimit = Number(query.limit)
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 50
  const rows = await listGuides(useDb(), { group: typeof query.group === 'string' ? query.group : undefined, status: 'PUBLISHED' })
  return { data: rows.slice(0, limit).map(publicGuide) }
})
