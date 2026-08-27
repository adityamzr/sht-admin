import { listArticles } from '~/server/services/articles'
import { publicArticle } from '~/server/utils/serializers'
import { useDb } from '~/server/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const limitRaw = Number(query.limit)
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 100) : 20
  const rows = await listArticles(useDb(), {
    status: 'PUBLISHED',
    city: typeof query.city === 'string' ? query.city : undefined,
    category: typeof query.category === 'string' ? query.category : undefined,
  })
  const filtered = typeof query.contentType === 'string' ? rows.filter((row) => row.contentType === query.contentType) : rows
  return { data: filtered.slice(0, limit).map(publicArticle) }
})
