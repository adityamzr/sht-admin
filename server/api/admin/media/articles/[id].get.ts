import { getArticle } from '~/server/services/articles'
import { useDb } from '~/server/db'
import { adminArticle } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const row = await getArticle(useDb(), Number(getRouterParam(event, 'id')))
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Artikel tidak ditemukan.' })
  return { data: adminArticle(row) }
})
