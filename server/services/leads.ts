import { and, desc, eq } from 'drizzle-orm'
import { estimations, leads, services } from '../db/schema'
import type { DbLike } from '../db'

/**
 * LEAD FOUNDATION: lihat daftar/detail + ubah status + buat lead.
 * Dua origin: estimation (terhubung estimasi) & service_inquiry (tanpa estimasi).
 */

export interface CreateLeadInput {
  name: string
  whatsapp: string
  email?: string | null
  origin: 'estimation' | 'service_inquiry'
  source?: string | null
  serviceId?: number | null
  estimationId?: number | null
  notes?: string | null
}

export async function createLead(db: DbLike, input: CreateLeadInput) {
  const rows = await db
    .insert(leads)
    .values({
      name: input.name,
      whatsapp: input.whatsapp,
      email: input.email ?? null,
      origin: input.origin,
      source: input.source ?? null,
      serviceId: input.serviceId ?? null,
      estimationId: input.estimationId ?? null,
      notes: input.notes ?? null,
      status: 'NEW',
    })
    .returning()
  return rows[0]
}

export async function listLeads(db: DbLike, filter?: { status?: string; origin?: string }) {
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

export async function getLead(db: DbLike, id: number) {
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

export async function updateLeadStatus(db: DbLike, id: number, status: string, notes?: string) {
  const patch: Record<string, unknown> = { status, updatedAt: new Date() }
  if (notes !== undefined) patch.notes = notes
  const rows = await db.update(leads).set(patch as never).where(eq(leads.id, id)).returning()
  return rows[0] ?? null
}
