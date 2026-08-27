import { getArticle, slugExists, updateArticle } from '~/server/services/articles'
import { useDb } from '~/server/db'
import { articleInput } from '~/server/utils/validators'
import { adminArticle } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, articleInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input artikel tidak valid' })
  const db = useDb()
  const existing = await getArticle(db, id)
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Artikel tidak ditemukan.' })
  if (existing.status === 'PUBLISHED' && existing.slug !== body.data.slug) throw createError({ statusCode: 409, statusMessage: 'Slug artikel terbit tidak dapat diubah.' })
  if (await slugExists(db, body.data.slug, id)) throw createError({ statusCode: 409, statusMessage: 'Slug sudah digunakan artikel lain.' })
  const row = await updateArticle(db, id, { ...body.data, publishedAt: body.data.publishedAt ? new Date(body.data.publishedAt) : null })
  return { data: adminArticle(row!) }
})
