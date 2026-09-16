import { count, eq, isNull } from 'drizzle-orm'
import { estimations, flights, hotels, leads, services, transportVehicles } from '~/server/db/schema'
import { useDb } from '~/server/db'
import { getTourOpsSummary, getTourWorkspaceId } from '~/server/services/tour-operations'

/** Ringkasan dashboard admin (angka operasional sederhana + ops Phase 1). */
export default defineEventHandler(async () => {
  const db = useDb()
  const [newLeads, totalLeads, totalEstimations, hotelsN, flightsN, servicesN, vehiclesN, tourWorkspaceId] = await Promise.all([
    db.select({ v: count() }).from(leads).where(eq(leads.status, 'NEW')),
    db.select({ v: count() }).from(leads),
    db.select({ v: count() }).from(estimations),
    db.select({ v: count() }).from(hotels).where(isNull(hotels.deletedAt)),
    db.select({ v: count() }).from(flights).where(isNull(flights.deletedAt)),
    db.select({ v: count() }).from(services).where(isNull(services.deletedAt)),
    db.select({ v: count() }).from(transportVehicles).where(isNull(transportVehicles.deletedAt)),
    getTourWorkspaceId(db).catch(() => 1),
  ])

  let ops: Awaited<ReturnType<typeof getTourOpsSummary>> | null = null
  try {
    ops = await getTourOpsSummary(db, tourWorkspaceId)
  } catch {
    ops = null
  }

  return {
    newLeads: newLeads[0]?.v ?? 0,
    totalLeads: totalLeads[0]?.v ?? 0,
    totalEstimations: totalEstimations[0]?.v ?? 0,
    activeProducts: (hotelsN[0]?.v ?? 0) + (flightsN[0]?.v ?? 0) + (servicesN[0]?.v ?? 0) + (vehiclesN[0]?.v ?? 0),
    // Phase 1 light enhancement
    activeOrders: ops?.activeOrders ?? 0,
    totalOrders: ops?.totalOrders ?? 0,
    totalPax: ops?.totalPax ?? 0,
    upcomingTrips: ops?.upcomingTrips ?? 0,
    confirmedBookings: ops?.confirmedBookings ?? 0,
    totalCustomers: ops?.totalCustomers ?? 0,
    totalTrips: ops?.totalTrips ?? 0,
  }
})
