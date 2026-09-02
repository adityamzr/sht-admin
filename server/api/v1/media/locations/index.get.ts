import { listLocalizedLocations } from '~/server/services/map-locations'
import { publicMapLocation } from '~/server/utils/serializers'
import { useDb } from '~/server/db'
import { parseLocale } from '~/server/utils/locales'
export default defineEventHandler(async (event) => {
  const q = getQuery(event), locale = parseLocale(q.locale)
  const rows = await listLocalizedLocations(useDb(), { locale,
    city: typeof q.city === 'string' ? q.city : undefined, category: typeof q.category === 'string' ? q.category : undefined,
    search: typeof q.search === 'string' ? q.search.trim() : undefined,
  })
  return { data: rows.map(publicMapLocation) }
})
