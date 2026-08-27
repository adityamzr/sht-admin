import { listArticles } from '~/server/services/articles'
import { adminArticle } from '~/server/utils/serializers'
import { useDb } from '~/server/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const rows = await listArticles(useDb(), {
    search: typeof query.search === 'string' ? query.search.trim() : undefined,
    status: typeof query.status === 'string' ? query.status : undefined,
    city: typeof query.city === 'string' ? query.city : undefined,
    category: typeof query.category === 'string' ? query.category : undefined,
  })
  return { data: rows.map(adminArticle) }
})
