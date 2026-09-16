import { useDb } from '~/server/db'
import { listTripOrdersEnriched, getTourWorkspaceId } from '~/server/services/tour-operations'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const tripId = q.tripId ? Number(q.tripId) : undefined
  const orderId = q.orderId ? Number(q.orderId) : undefined
  const rows = await listTripOrdersEnriched(db, workspaceId, tripId, orderId)
  return { data: rows }
})
