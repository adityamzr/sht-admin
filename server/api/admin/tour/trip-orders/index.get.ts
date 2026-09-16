import { useDb } from '~/server/db'
import { listTripOrders, getTourWorkspaceId } from '~/server/services/tour-operations'
import { adminTourTripOrder } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const tripId = q.tripId ? Number(q.tripId) : undefined
  const orderId = q.orderId ? Number(q.orderId) : undefined
  const rows = await listTripOrders(db, workspaceId, tripId, orderId)
  return { data: rows.map(adminTourTripOrder) }
})
