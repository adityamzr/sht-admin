import { listLocalizedArticles } from '~/server/services/articles'
import { publicArticle } from '~/server/utils/serializers'
import { parseLocale } from '~/server/utils/locales'
import { useDb } from '~/server/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const locale = parseLocale(query.locale)
  const raw = Number(query.limit)
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(Math.floor(raw), 100) : 20
  const rows = await listLocalizedArticles(useDb(), {
    locale, limit,
    city: typeof query.city === 'string' ? query.city : undefined,
    category: typeof query.category === 'string' ? query.category : undefined,
    search: typeof query.search === 'string' ? query.search.trim() : undefined,
  })
  return { data: rows.map(publicArticle) }
})
