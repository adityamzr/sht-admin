import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm'
import type { z } from 'zod'
import { galleryItems, galleryTranslations } from '../db/schema'
import type { DbLike } from '../db'
import type { galleryInput } from '../utils/validators'
import { nonBlank, readinessCondition } from '../utils/media-localization'
import { DEFAULT_LOCALE, type SupportedLocale } from '../../shared/locales'
import type { TranslationReadiness } from '../../shared/media-localization'

export type GalleryInput = Omit<z.output<typeof galleryInput>, 'publishedAt' | 'takenAt'> & { publishedAt?: Date | null; takenAt?: Date | null }
type Filters = { search?: string; city?: string; category?: string; status?: string; tag?: string; translation?: TranslationReadiness; limit?: number; offset?: number }
type Row = typeof galleryItems.$inferSelect
type TextRow = typeof galleryTranslations.$inferSelect
const enJoin = and(eq(galleryTranslations.galleryId, galleryItems.id), eq(galleryTranslations.locale, 'en'))
function complete() { return nonBlank(galleryTranslations.altText) }
function textSearch(search: string) { const needle = `%${search}%`; return or(ilike(galleryTranslations.title, needle), ilike(galleryTranslations.altText, needle), ilike(galleryTranslations.description, needle), ilike(galleryTranslations.locationName, needle)) }
function whereFor(f: Filters) {
  return and(
    f.city ? eq(galleryItems.city, f.city) : undefined, f.category ? eq(galleryItems.category, f.category) : undefined, f.status ? eq(galleryItems.status, f.status) : undefined, f.tag ? sql`${galleryItems.tags} @> ${JSON.stringify([f.tag])}::jsonb` : undefined,
    readinessCondition(f.translation, complete()),
    f.search ? or(or(ilike(galleryItems.title, `%${f.search}%`), ilike(galleryItems.altText, `%${f.search}%`), ilike(galleryItems.description, `%${f.search}%`), ilike(galleryItems.locationName, `%${f.search}%`)), textSearch(f.search)) : undefined,
  )
}
export async function listGallery(db: DbLike, f: Filters) {
  const query = db.select({ row: galleryItems }).from(galleryItems).leftJoin(galleryTranslations, enJoin).where(whereFor(f)).orderBy(desc(galleryItems.priority), desc(galleryItems.publishedAt), desc(galleryItems.updatedAt), asc(galleryItems.id))
  if (f.limit !== undefined) query.limit(f.limit)
  if (f.offset !== undefined) query.offset(f.offset)
  return (await query).map(({ row }) => row)
}
export async function countGallery(db: DbLike, f: Omit<Filters, 'limit' | 'offset'>) {
  const [row] = await db.select({ value: count() }).from(galleryItems).leftJoin(galleryTranslations, enJoin).where(whereFor(f))
  return Number(row?.value ?? 0)
}
export async function getGallery(db: DbLike, id: number) {
  const [row] = await db.select().from(galleryItems).where(eq(galleryItems.id, id)).limit(1)
  return row ?? null
}
export async function getGalleryTranslations(db: DbLike, id: number) {
  return db.select().from(galleryTranslations).where(eq(galleryTranslations.galleryId, id))
}
export function localizedGalleryRow(row: Row, text?: TextRow | null): Row { return text ? { ...row, title: text.title, altText: text.altText, description: text.description, locationName: text.locationName } : row }
export async function listLocalizedGallery(db: DbLike, f: Filters & { locale?: SupportedLocale }) {
  const locale = f.locale ?? DEFAULT_LOCALE
  const query = db.select({ row: galleryItems, text: galleryTranslations }).from(galleryItems)
    .leftJoin(galleryTranslations, and(eq(galleryTranslations.galleryId, galleryItems.id), eq(galleryTranslations.locale, locale)))
    .where(and(whereFor({ ...f, status: 'PUBLISHED', search: undefined, translation: undefined }), locale === DEFAULT_LOCALE ? undefined : complete(),
      f.search ? or(textSearch(f.search), locale === DEFAULT_LOCALE ? and(sql`${galleryTranslations.id} is null`, or(ilike(galleryItems.title, `%${f.search}%`), ilike(galleryItems.altText, `%${f.search}%`), ilike(galleryItems.description, `%${f.search}%`), ilike(galleryItems.locationName, `%${f.search}%`))) : undefined) : undefined,
    )).orderBy(desc(galleryItems.priority), desc(galleryItems.publishedAt), desc(galleryItems.updatedAt), asc(galleryItems.id))
  if (f.limit !== undefined) query.limit(f.limit)
  if (f.offset !== undefined) query.offset(f.offset)
  return (await query).map(({ row, text }) => localizedGalleryRow(row, text))
}
export async function getPublishedGallery(db: DbLike, id: number, locale: SupportedLocale = DEFAULT_LOCALE) {
  const [found] = await db.select({ row: galleryItems, text: galleryTranslations }).from(galleryItems)
    .leftJoin(galleryTranslations, and(eq(galleryTranslations.galleryId, galleryItems.id), eq(galleryTranslations.locale, locale)))
    .where(and(eq(galleryItems.id, id), eq(galleryItems.status, 'PUBLISHED'), locale === DEFAULT_LOCALE ? undefined : complete())).limit(1)
  return found ? localizedGalleryRow(found.row, found.text) : null
}
function masterValues(input: GalleryInput) {
  return { ...input.translations.id, imageUrl: input.imageUrl, imageFileId: input.imageFileId, city: input.city, category: input.category, latitude: input.latitude == null ? null : String(input.latitude), longitude: input.longitude == null ? null : String(input.longitude), tags: input.tags, priority: input.priority, status: input.status, takenAt: input.takenAt, updatedAt: new Date() }
}
async function writeTranslations(db: DbLike, id: number, input: GalleryInput) {
  for (const [locale, text] of Object.entries(input.translations)) {
    if (!text) continue
    const values = { ...text, updatedAt: new Date() }
    await db.insert(galleryTranslations).values({ galleryId: id, locale, ...values }).onConflictDoUpdate({ target: [galleryTranslations.galleryId, galleryTranslations.locale], set: values })
  }
}
export async function createGallery(db: DbLike, input: GalleryInput) {
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(galleryItems).values({ ...masterValues(input), publishedAt: input.status === 'PUBLISHED' ? input.publishedAt ?? new Date() : null }).returning()
    await writeTranslations(tx, row.id, input)
    return row
  })
}
export async function updateGallery(db: DbLike, id: number, input: GalleryInput) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(galleryItems).where(eq(galleryItems.id, id)).limit(1).for('update')
    if (!existing) return null
    const [row] = await tx.update(galleryItems).set({ ...masterValues(input), publishedAt: input.status === 'PUBLISHED' ? input.publishedAt ?? existing.publishedAt ?? new Date() : null }).where(eq(galleryItems.id, id)).returning()
    await writeTranslations(tx, id, input)
    return row
  })
}
export async function deleteGallery(db: DbLike, id: number) {
  const [row] = await db.delete(galleryItems).where(eq(galleryItems.id, id)).returning({ id: galleryItems.id })
  return row ?? null
}
