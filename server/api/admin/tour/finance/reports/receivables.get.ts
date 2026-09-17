import { useDb } from '~/server/db'
import { listTourInvoicesEnriched, getTourWorkspaceIdFinance } from '~/server/services/tour-finance'

function toIso(d: any): string | null {
  if (!d) return null
  if (typeof d === 'string') return d.slice(0,10)
  if (d instanceof Date) return d.toISOString().slice(0,10)
  return String(d).slice(0,10)
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdFinance(db)
  const result = await listTourInvoicesEnriched(db, {
    workspaceId,
    state: typeof q.state === 'string' ? q.state : undefined,
    orderId: q.orderId ? Number(q.orderId) : undefined,
    page: Number(q.page) || 1,
    pageSize: Number(q.pageSize) || 50,
  })
  let data = result.data.filter((inv: any) => inv.state !== 'CANCELLED' && inv.outstanding > 0)
  if (q.startDate || q.endDate) {
    const start = q.startDate ? String(q.startDate).slice(0, 10) : null
    const end = q.endDate ? String(q.endDate).slice(0, 10) : null
    data = data.filter((inv: any) => {
      const d = toIso(inv.dueDate) || toIso(inv.issueDate)
      if (!d) return false
      if (start && d < start) return false
      if (end && d > end) return false
      return true
    })
  }
  const totalOutstanding = data.reduce((s: number, inv: any) => s + Number(inv.outstanding ?? 0), 0)
  return { data, meta: { ...result, totalOutstanding } }
})
