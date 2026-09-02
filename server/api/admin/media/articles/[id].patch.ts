import { getArticleTranslations, updateArticle } from '~/server/services/articles'
import { useDb } from '~/server/db'
import { articleInput } from '~/server/utils/validators'
import { adminArticleWithTranslations } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, articleInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input artikel tidak valid' })
  const db = useDb()
  const row = await updateArticle(db, id, { ...body.data, publishedAt: body.data.publishedAt ? new Date(body.data.publishedAt) : null })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Artikel tidak ditemukan.' })
  return { data: adminArticleWithTranslations(row, await getArticleTranslations(db, row.id)) }
})
