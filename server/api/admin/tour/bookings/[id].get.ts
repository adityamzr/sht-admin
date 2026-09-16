import { useDb } from '~/server/db'
import { getTourBookingEnriched, getTourWorkspaceId } from '~/server/services/tour-operations'
import { adminTourBooking } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const row = await getTourBookingEnriched(db, id, workspaceId)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Booking tidak ditemukan' })
  return { data: { ...adminTourBooking(row as any), vendor: (row as any).vendor, trip: (row as any).trip, order: (row as any).order, customer: (row as any).customer } }
})
