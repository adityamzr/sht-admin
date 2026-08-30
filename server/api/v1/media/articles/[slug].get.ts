import { getPublishedArticleBySlug } from '~/server/services/articles'
import { publicArticle } from '~/server/utils/serializers'
import { useDb } from '~/server/db'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const row = await getPublishedArticleBySlug(useDb(), slug)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Artikel tidak ditemukan.' })
  return { data: publicArticle(row) }
})
