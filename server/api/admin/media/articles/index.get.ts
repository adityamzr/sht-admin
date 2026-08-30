import { countArticles, listArticles } from '~/server/services/articles'
import { adminArticle } from '~/server/utils/serializers'
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
  const [rows, total] = await Promise.all([
    listArticles(db, { ...filters, limit: pageSize, offset: (page - 1) * pageSize }),
    countArticles(db, filters),
  ])
  return { data: rows.map(adminArticle), meta: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) } }
})
