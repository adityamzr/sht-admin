import { getPublishedArticleByLocalizedSlug, getArticleTranslations, localizedArticleRow } from '~/server/services/articles'
import { publicArticle } from '~/server/utils/serializers'
import { parseLocale } from '~/server/utils/locales'
import { articleLocaleLinks } from '~/shared/article-localization'
import { useDb } from '~/server/db'

export default defineEventHandler(async (event) => {
  const locale = parseLocale(getQuery(event).locale)
  const db = useDb()
  const found = await getPublishedArticleByLocalizedSlug(db, String(getRouterParam(event, 'slug') || ''), locale)
  if (!found) throw createError({ statusCode: 404, statusMessage: 'Artikel tidak ditemukan atau terjemahan belum tersedia.' })
  const translations = await getArticleTranslations(db, found.article.id)
  return { data: { ...publicArticle(localizedArticleRow(found.article, found.translation)), ...articleLocaleLinks(translations) } }
})
