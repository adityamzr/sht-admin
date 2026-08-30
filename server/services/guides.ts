import { and, count, desc, asc, eq, ilike, or, sql } from 'drizzle-orm'
import { guides } from '../db/schema'
import type { DbLike } from '../db'

export type GuideInput = { title: string; slug: string; group: string; summary?: string | null; body: unknown[]; sortOrder: number; status: string; publishedAt?: Date | null }
type GuideFilters = { search?: string; group?: string; status?: string; limit?: number; offset?: number }

function conditionsFor(filters: GuideFilters) {
  const conditions = []
  if (filters.group) conditions.push(eq(guides.group, filters.group))
  if (filters.status) conditions.push(eq(guides.status, filters.status))
  if (filters.search) conditions.push(or(ilike(guides.title, `%${filters.search}%`), ilike(guides.slug, `%${filters.search}%`), ilike(guides.group, `%${filters.search}%`)))
  return conditions.length ? and(...conditions) : undefined
}

export async function listGuides(db: DbLike, filters: GuideFilters) {
  const groupOrder = sql<number>`CASE ${guides.group} WHEN 'MULAI DI SINI' THEN 1 WHEN 'KEHIDUPAN DI HARAMAIN' THEN 2 WHEN 'TRANSPORTASI' THEN 3 WHEN 'HOTEL' THEN 4 WHEN 'MAKKAH' THEN 5 WHEN 'MADINAH' THEN 6 WHEN 'PERJALANAN' THEN 7 WHEN 'IBADAH' THEN 8 ELSE 99 END`
  const query = db.select().from(guides).where(conditionsFor(filters)).orderBy(asc(groupOrder), asc(guides.sortOrder), desc(guides.updatedAt))
  if (filters.limit !== undefined) query.limit(filters.limit)
  if (filters.offset !== undefined) query.offset(filters.offset)
  return query
}

export async function countGuides(db: DbLike, filters: Omit<GuideFilters, 'limit' | 'offset'>) {
  const rows = await db.select({ value: count() }).from(guides).where(conditionsFor(filters))
  return Number(rows[0]?.value ?? 0)
}

export async function getGuide(db: DbLike, id: number) {
  const rows = await db.select().from(guides).where(eq(guides.id, id)).limit(1)
  return rows[0] ?? null
}

export async function getPublishedGuideBySlug(db: DbLike, slug: string) {
  const rows = await db.select().from(guides).where(and(eq(guides.slug, slug), eq(guides.status, 'PUBLISHED'))).limit(1)
  return rows[0] ?? null
}

export async function guideSlugExists(db: DbLike, slug: string, excludeId?: number) {
  const rows = await db.select({ id: guides.id }).from(guides).where(eq(guides.slug, slug)).limit(2)
  return rows.some((row) => row.id !== excludeId)
}

export async function createGuide(db: DbLike, input: GuideInput) {
  const rows = await db.insert(guides).values({ ...input, publishedAt: input.status === 'PUBLISHED' ? input.publishedAt ?? new Date() : null, updatedAt: new Date() }).returning()
  return rows[0]
}

export async function updateGuide(db: DbLike, id: number, input: GuideInput) {
  const existing = await getGuide(db, id)
  if (!existing) return null
  const publishedAt = input.status === 'PUBLISHED' ? input.publishedAt ?? existing.publishedAt ?? new Date() : null
  const rows = await db.update(guides).set({ ...input, publishedAt, updatedAt: new Date() }).where(eq(guides.id, id)).returning()
  return rows[0] ?? null
}

export async function updateGuideStatus(db: DbLike, id: number, status: string) {
  const existing = await getGuide(db, id)
  if (!existing) return null
  const rows = await db.update(guides).set({ status, publishedAt: status === 'PUBLISHED' ? existing.publishedAt ?? new Date() : null, updatedAt: new Date() }).where(eq(guides.id, id)).returning()
  return rows[0] ?? null
}

export async function deleteGuide(db: DbLike, id: number) {
  const rows = await db.delete(guides).where(eq(guides.id, id)).returning({ id: guides.id })
  return rows[0] ?? null
}
