import { countArticles, listArticles, getArticleTranslations, listArticlesByTranslationReadiness } from '~/server/services/articles'
import { adminArticleWithTranslations } from '~/server/utils/serializers'
import { useDb } from '~/server/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const pageSizeRaw = Number(query.pageSize)
  const pageRaw = Number(query.page)
  const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.min(Math.floor(pageSizeRaw), 50) : 10
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1
  const filters = {
    search: typeof query.search === 'string' ? query.search.trim() : undefined,
    status: typeof query.status === 'string' ? query.status : undefined,
    city: typeof query.city === 'string' ? query.city : undefined,
    category: typeof query.category === 'string' ? query.category : undefined,
  }
  const db = useDb()
  const readiness = query.translation === 'complete' || query.translation === 'incomplete' ? query.translation : undefined
  if (readiness) { const result = await listArticlesByTranslationReadiness(db, filters, readiness, pageSize, (page - 1) * pageSize); return { data: result.rows.map((row) => adminArticleWithTranslations(row, row.translations)), meta: { page, pageSize, total: result.total, pageCount: Math.ceil(result.total / pageSize) } } }
  const [rows, total] = await Promise.all([listArticles(db, { ...filters, limit: pageSize, offset: (page - 1) * pageSize }), countArticles(db, filters)])
  const data = await Promise.all(rows.map(async (row) => adminArticleWithTranslations(row, await getArticleTranslations(db, row.id))))
  return { data, meta: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) } }
})
