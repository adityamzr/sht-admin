import { and, count, desc, asc, eq, ilike, or, sql } from 'drizzle-orm'
import { createError } from 'h3'
import type { z } from 'zod'
import { guides, guideTranslations } from '../db/schema'
import type { DbLike } from '../db'
import type { guideInput } from '../utils/validators'
import { nonBlank, nonEmptyBody, readinessCondition, translationComplete, rethrowLocalizedWrite } from '../utils/media-localization'
import { DEFAULT_LOCALE, type SupportedLocale } from '../../shared/locales'
import type { TranslationReadiness } from '../../shared/media-localization'

export type GuideInput = Omit<z.output<typeof guideInput>, 'publishedAt'> & { publishedAt?: Date | null }
type GuideFilters = { search?: string; group?: string; status?: string; translation?: TranslationReadiness; limit?: number; offset?: number }
type GuideRow = typeof guides.$inferSelect
type TextRow = typeof guideTranslations.$inferSelect
const enJoin = and(eq(guideTranslations.guideId, guides.id), eq(guideTranslations.locale, 'en'))
function complete() { return translationComplete(nonBlank(guideTranslations.title), nonBlank(guideTranslations.slug), nonEmptyBody(guideTranslations.body)) }
function conditionsFor(filters: GuideFilters) {
  return and(
    filters.group ? eq(guides.group, filters.group) : undefined,
    filters.status ? eq(guides.status, filters.status) : undefined,
    readinessCondition(filters.translation, complete()),
    filters.search ? or(ilike(guides.title, `%${filters.search}%`), ilike(guides.slug, `%${filters.search}%`), ilike(guides.group, `%${filters.search}%`), textSearch(filters.search)) : undefined,
  )
}
function textSearch(search: string) {
  const needle = `%${search}%`
  return or(ilike(guideTranslations.title, needle), ilike(guideTranslations.slug, needle), ilike(guideTranslations.summary, needle))
}
function order() {
  const groupOrder = sql<number>`CASE ${guides.group} WHEN 'MULAI DI SINI' THEN 1 WHEN 'KEHIDUPAN DI HARAMAIN' THEN 2 WHEN 'TRANSPORTASI' THEN 3 WHEN 'HOTEL' THEN 4 WHEN 'MAKKAH' THEN 5 WHEN 'MADINAH' THEN 6 WHEN 'PERJALANAN' THEN 7 WHEN 'IBADAH' THEN 8 ELSE 99 END`
  return [asc(groupOrder), asc(guides.sortOrder), desc(guides.updatedAt), asc(guides.id)]
}
export async function listGuides(db: DbLike, filters: GuideFilters) {
  const query = db.select({ row: guides }).from(guides).leftJoin(guideTranslations, enJoin).where(conditionsFor(filters)).orderBy(...order())
  if (filters.limit !== undefined) query.limit(filters.limit)
  if (filters.offset !== undefined) query.offset(filters.offset)
  return (await query).map(({ row }) => row)
}
export async function countGuides(db: DbLike, filters: Omit<GuideFilters, 'limit' | 'offset'>) {
  const rows = await db.select({ value: count() }).from(guides).leftJoin(guideTranslations, enJoin).where(conditionsFor(filters))
  return Number(rows[0]?.value ?? 0)
}
export async function getGuide(db: DbLike, id: number) {
  const [row] = await db.select().from(guides).where(eq(guides.id, id)).limit(1)
  return row ?? null
}
export async function getGuideTranslations(db: DbLike, id: number) {
  return db.select().from(guideTranslations).where(eq(guideTranslations.guideId, id))
}
export function localizedGuideRow(row: GuideRow, text?: TextRow | null): GuideRow {
  return text ? { ...row, title: text.title, slug: text.slug ?? '', summary: text.summary, body: text.body } : row
}
export async function listLocalizedGuides(db: DbLike, filters: GuideFilters & { locale?: SupportedLocale }) {
  const locale = filters.locale ?? DEFAULT_LOCALE
  const query = db.select({ row: guides, text: guideTranslations }).from(guides)
    .leftJoin(guideTranslations, and(eq(guideTranslations.guideId, guides.id), eq(guideTranslations.locale, locale)))
    .where(and(conditionsFor({ ...filters, status: 'PUBLISHED', search: undefined, translation: undefined }),
      locale === DEFAULT_LOCALE ? undefined : complete(),
      filters.search ? or(textSearch(filters.search), locale === DEFAULT_LOCALE ? and(sql`${guideTranslations.id} is null`, or(ilike(guides.title, `%${filters.search}%`), ilike(guides.slug, `%${filters.search}%`), ilike(guides.summary, `%${filters.search}%`))) : undefined) : undefined,
    )).orderBy(...order())
  if (filters.limit !== undefined) query.limit(filters.limit)
  if (filters.offset !== undefined) query.offset(filters.offset)
  return (await query).map(({ row, text }) => localizedGuideRow(row, text))
}
export async function getPublishedGuideBySlug(db: DbLike, slug: string, locale: SupportedLocale = DEFAULT_LOCALE) {
  const [found] = await db.select({ row: guides, text: guideTranslations }).from(guides)
    .leftJoin(guideTranslations, and(eq(guideTranslations.guideId, guides.id), eq(guideTranslations.locale, locale)))
    .where(and(eq(guides.status, 'PUBLISHED'), locale === DEFAULT_LOCALE ? undefined : complete(),
      or(eq(guideTranslations.slug, slug), locale === DEFAULT_LOCALE ? and(sql`${guideTranslations.id} is null`, eq(guides.slug, slug)) : undefined),
    )).limit(1)
  return found ? localizedGuideRow(found.row, found.text) : null
}
export async function guideSlugExists(db: DbLike, slug: string, excludeId?: number) {
  const rows = await db.select({ id: guides.id }).from(guides).where(eq(guides.slug, slug)).limit(2)
  return rows.some((row) => row.id !== excludeId)
}
async function validateSlugs(db: DbLike, input: GuideInput, id?: number) {
  if (await guideSlugExists(db, input.translations.id.slug, id)) throw createError({ statusCode: 409, statusMessage: 'Slug panduan sudah digunakan.' })
  for (const [locale, text] of Object.entries(input.translations)) {
    if (!text?.slug) continue
    const rows = await db.select({ guideId: guideTranslations.guideId }).from(guideTranslations).where(and(eq(guideTranslations.locale, locale), eq(guideTranslations.slug, text.slug))).limit(2)
    if (rows.some((row) => row.guideId !== id)) throw createError({ statusCode: 409, statusMessage: 'Slug panduan sudah digunakan.' })
  }
}
function masterValues(input: GuideInput) {
  return { ...input.translations.id, group: input.group, sortOrder: input.sortOrder, status: input.status, updatedAt: new Date() }
}
async function writeTranslations(db: DbLike, id: number, input: GuideInput) {
  for (const [locale, text] of Object.entries(input.translations)) {
    if (!text) continue
    const values = { ...text, updatedAt: new Date() }
    await db.insert(guideTranslations).values({ guideId: id, locale, ...values }).onConflictDoUpdate({ target: [guideTranslations.guideId, guideTranslations.locale], set: values })
  }
}
export async function createGuide(db: DbLike, input: GuideInput) {
  try {
    return await db.transaction(async (tx) => {
      await validateSlugs(tx, input)
      const [row] = await tx.insert(guides).values({ ...masterValues(input), publishedAt: input.status === 'PUBLISHED' ? input.publishedAt ?? new Date() : null }).returning()
      await writeTranslations(tx, row.id, input)
      return row
    })
  } catch (error) { rethrowLocalizedWrite(error) }
}
export async function updateGuide(db: DbLike, id: number, input: GuideInput) {
  try {
    return await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(guides).where(eq(guides.id, id)).limit(1).for('update')
      if (!existing) return null
      await validateSlugs(tx, input, id)
      const [row] = await tx.update(guides).set({ ...masterValues(input), publishedAt: input.status === 'PUBLISHED' ? input.publishedAt ?? existing.publishedAt ?? new Date() : null }).where(eq(guides.id, id)).returning()
      await writeTranslations(tx, id, input)
      return row
    })
  } catch (error) { rethrowLocalizedWrite(error) }
}
export async function updateGuideStatus(db: DbLike, id: number, status: string) {
  const existing = await getGuide(db, id)
  if (!existing) return null
  const [row] = await db.update(guides).set({ status, publishedAt: status === 'PUBLISHED' ? existing.publishedAt ?? new Date() : null, updatedAt: new Date() }).where(eq(guides.id, id)).returning()
  return row ?? null
}
export async function deleteGuide(db: DbLike, id: number) {
  const [row] = await db.delete(guides).where(eq(guides.id, id)).returning({ id: guides.id })
  return row ?? null
}
