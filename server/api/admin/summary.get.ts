import { count, eq, isNull } from 'drizzle-orm'
import { estimations, flights, hotels, leads, services, transportVehicles } from '~/server/db/schema'
import { useDb } from '~/server/db'

/** Ringkasan dashboard admin (angka operasional sederhana). */
export default defineEventHandler(async () => {
  const db = useDb()
  const [newLeads, totalLeads, totalEstimations, hotelsN, flightsN, servicesN, vehiclesN] = await Promise.all([
    db.select({ v: count() }).from(leads).where(eq(leads.status, 'NEW')),
    db.select({ v: count() }).from(leads),
    db.select({ v: count() }).from(estimations),
    db.select({ v: count() }).from(hotels).where(isNull(hotels.deletedAt)),
    db.select({ v: count() }).from(flights).where(isNull(flights.deletedAt)),
    db.select({ v: count() }).from(services).where(isNull(services.deletedAt)),
    db.select({ v: count() }).from(transportVehicles).where(isNull(transportVehicles.deletedAt)),
  ])
  return {
    newLeads: newLeads[0]?.v ?? 0,
    totalLeads: totalLeads[0]?.v ?? 0,
    totalEstimations: totalEstimations[0]?.v ?? 0,
    activeProducts: (hotelsN[0]?.v ?? 0) + (flightsN[0]?.v ?? 0) + (servicesN[0]?.v ?? 0) + (vehiclesN[0]?.v ?? 0),
  }
})
