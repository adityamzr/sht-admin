import { and, desc, eq } from 'drizzle-orm'
import { estimations, leads, services } from '../db/schema'
import type { Db } from '../db'

/**
 * LEAD FOUNDATION (M2): lihat daftar/detail + ubah status (lifecycle).
 * Dua origin: estimation (terhubung estimasi) & service_inquiry (tanpa estimasi).
 * Pembuatan lead dari flow customer diimplementasikan di M3+.
 */

export async function listLeads(db: Db, filter?: { status?: string; origin?: string }) {
  const cond = []
  if (filter?.status) cond.push(eq(leads.status, filter.status))
  if (filter?.origin) cond.push(eq(leads.origin, filter.origin))
  return db
    .select({
      lead: leads,
      serviceName: services.name,
      estimationNumber: estimations.estimationNumber,
    })
    .from(leads)
    .leftJoin(services, eq(leads.serviceId, services.id))
    .leftJoin(estimations, eq(leads.estimationId, estimations.id))
    .where(cond.length ? and(...cond) : undefined)
    .orderBy(desc(leads.createdAt))
}

export async function getLead(db: Db, id: number) {
  const rows = await db
    .select({
      lead: leads,
      serviceName: services.name,
      estimationNumber: estimations.estimationNumber,
    })
    .from(leads)
    .leftJoin(services, eq(leads.serviceId, services.id))
    .leftJoin(estimations, eq(leads.estimationId, estimations.id))
    .where(eq(leads.id, id))
    .limit(1)
  return rows[0] ?? null
}

export async function updateLeadStatus(db: Db, id: number, status: string, notes?: string) {
  const patch: Record<string, unknown> = { status, updatedAt: new Date() }
  if (notes !== undefined) patch.notes = notes
  const rows = await db.update(leads).set(patch as never).where(eq(leads.id, id)).returning()
  return rows[0] ?? null
}
