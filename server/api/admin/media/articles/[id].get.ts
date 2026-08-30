import { getArticle, getArticleTranslations } from '~/server/services/articles'
import { useDb } from '~/server/db'
import { adminArticleWithTranslations } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const row = await getArticle(useDb(), Number(getRouterParam(event, 'id')))
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Artikel tidak ditemukan.' })
  return { data: adminArticleWithTranslations(row, await getArticleTranslations(useDb(), row.id)) }
})
