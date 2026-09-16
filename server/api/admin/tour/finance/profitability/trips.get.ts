import { useDb } from '~/server/db'
import { getTripProfitability, getTourWorkspaceIdFinance } from '~/server/services/tour-finance'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdFinance(db)
  const result = await getTripProfitability(db, workspaceId, {
    search: typeof q.search === 'string' ? q.search.trim() : undefined,
    tripId: q.tripId ? Number(q.tripId) : undefined,
    page: Number(q.page) || 1,
    pageSize: Number(q.pageSize) || 20,
  })
  return {
    data: result.data,
    meta: { page: result.page, pageSize: result.pageSize, total: result.total, pageCount: Math.ceil(result.total / result.pageSize) },
  }
})
