import { getArticle, updateArticleStatus } from '~/server/services/articles'
import { useDb } from '~/server/db'
import { ARTICLE_STATUSES } from '~/server/db/schema'
import { z } from 'zod'
import { adminArticle } from '~/server/utils/serializers'

const statusInput = z.object({ status: z.enum(ARTICLE_STATUSES) })

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, statusInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: 'Status artikel tidak valid.' })
  const row = await updateArticleStatus(useDb(), id, body.data.status)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Artikel tidak ditemukan.' })
  return { data: adminArticle(row) }
})
