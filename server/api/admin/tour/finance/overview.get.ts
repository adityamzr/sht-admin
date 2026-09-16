import { useDb } from '~/server/db'
import { getFinanceOverview, getTourWorkspaceIdFinance } from '~/server/services/tour-finance'
import { listTourBookingsEnriched, getTourWorkspaceId as getTourWorkspaceIdOps } from '~/server/services/tour-operations'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdFinance(db)
  const overview = await getFinanceOverview(db, workspaceId)

  // Upcoming Booking Due Dates (optional useful)
  let upcomingBookings: any[] = []
  try {
    const today = new Date().toISOString().slice(0, 10)
    const bookings = await listTourBookingsEnriched(db, { workspaceId, page: 1, pageSize: 20 })
    upcomingBookings = bookings.data.filter((b: any) => b.dueDate && b.dueDate >= today && (b.status === 'CONFIRMED' || b.status === 'DRAFT')).sort((a: any, b: any) => (a.dueDate > b.dueDate ? 1 : -1)).slice(0, 5)
  } catch {}

  return { data: { ...overview, upcomingBookings } }
})
