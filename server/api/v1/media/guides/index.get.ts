import { listLocalizedGuides } from '~/server/services/guides'
import { publicGuide } from '~/server/utils/serializers'
import { parseLocale } from '~/server/utils/locales'
import { useDb } from '~/server/db'
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const locale = parseLocale(query.locale)
  const raw = Number(query.limit)
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(Math.floor(raw), 100) : 50
  const rows = await listLocalizedGuides(useDb(), { locale, limit,
    group: typeof query.group === 'string' ? query.group : undefined,
    search: typeof query.search === 'string' ? query.search.trim() : undefined,
  })
  return { data: rows.map(publicGuide) }
})
