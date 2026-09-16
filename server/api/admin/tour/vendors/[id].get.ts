import { useDb } from '~/server/db'
import { getTourVendorIncludingDeleted, getTourWorkspaceId, listTourBookings } from '~/server/services/tour-operations'
import { adminTourVendor } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const row = await getTourVendorIncludingDeleted(db, id, workspaceId)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Vendor tidak ditemukan' })
  const bookings = await listTourBookings(db, { workspaceId, vendorId: id, page: 1, pageSize: 100 })
  return { data: { ...adminTourVendor(row), isArchived: !!row.deletedAt, deletedAt: row.deletedAt, bookings: bookings.data } }
})
