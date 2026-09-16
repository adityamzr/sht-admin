import { useDb } from '~/server/db'
import { listTourJamaahEnriched, getTourWorkspaceId } from '~/server/services/tour-operations'
import { adminTourJamaah } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const result = await listTourJamaahEnriched(db, {
    workspaceId,
    search: typeof q.search === 'string' ? q.search.trim() : undefined,
    orderId: q.orderId ? Number(q.orderId) : undefined,
    visaStatus: typeof q.visaStatus === 'string' ? q.visaStatus : undefined,
    siskopatuhStatus: typeof q.siskopatuhStatus === 'string' ? q.siskopatuhStatus : undefined,
    page: Number(q.page) || 1,
    pageSize: Number(q.pageSize) || 20,
  })
  return {
    data: result.data.map((r: any) => {
      const base = adminTourJamaah(r)
      return { ...base, order: r.order ?? null, customer: r.customer ?? null }
    }),
    meta: { page: result.page, pageSize: result.pageSize, total: result.total, pageCount: Math.ceil(result.total / result.pageSize) },
  }
})
