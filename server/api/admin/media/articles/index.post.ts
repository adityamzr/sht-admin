import { createArticle, slugExists } from '~/server/services/articles'
import { useDb } from '~/server/db'
import { articleInput } from '~/server/utils/validators'
import { adminArticle } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, articleInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input artikel tidak valid' })
  const db = useDb()
  if (await slugExists(db, body.data.slug)) throw createError({ statusCode: 409, statusMessage: 'Slug sudah digunakan artikel lain.' })
  const row = await createArticle(db, { ...body.data, publishedAt: body.data.publishedAt ? new Date(body.data.publishedAt) : null })
  return { data: adminArticle(row) }
})
