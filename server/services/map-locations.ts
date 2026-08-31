import { and, asc, count, eq, ilike, or, sql } from 'drizzle-orm'
import type { z } from 'zod'
import { mapLocations, mapLocationTranslations } from '../db/schema'
import type { DbLike } from '../db'
import type { locationInput } from '../utils/validators'
import { nonBlank, readinessCondition, translationComplete } from '../utils/media-localization'
import { DEFAULT_LOCALE, type SupportedLocale } from '../../shared/locales'
import type { TranslationReadiness } from '../../shared/media-localization'

export type LocationInput = z.output<typeof locationInput>
type Filters = { search?: string; city?: string; category?: string; active?: string; translation?: TranslationReadiness; limit?: number; offset?: number }
type Row = typeof mapLocations.$inferSelect
type TextRow = typeof mapLocationTranslations.$inferSelect
const enJoin = and(eq(mapLocationTranslations.locationId, mapLocations.id), eq(mapLocationTranslations.locale, 'en'))
function complete() { return translationComplete(nonBlank(mapLocationTranslations.name), nonBlank(mapLocationTranslations.shortDescription)) }
function textSearch(search: string) { const needle = `%${search}%`; return or(ilike(mapLocationTranslations.name, needle), ilike(mapLocationTranslations.shortDescription, needle), ilike(mapLocationTranslations.altText, needle)) }
function whereFor(f: Filters) {
  return and(
    f.city ? eq(mapLocations.city, f.city) : undefined, f.category ? eq(mapLocations.category, f.category) : undefined, f.active === 'true' ? eq(mapLocations.isActive, true) : f.active === 'false' ? eq(mapLocations.isActive, false) : undefined,
    readinessCondition(f.translation, complete()),
    f.search ? or(or(ilike(mapLocations.name, `%${f.search}%`), ilike(mapLocations.shortDescription, `%${f.search}%`), ilike(mapLocations.altText, `%${f.search}%`)), textSearch(f.search)) : undefined,
  )
}
export async function listLocations(db: DbLike, f: Filters) {
  const query = db.select({ row: mapLocations }).from(mapLocations).leftJoin(mapLocationTranslations, enJoin).where(whereFor(f)).orderBy(asc(mapLocations.sortOrder), asc(mapLocations.name), asc(mapLocations.id))
  if (f.limit !== undefined) query.limit(f.limit)
  if (f.offset !== undefined) query.offset(f.offset)
  return (await query).map(({ row }) => row)
}
export async function countLocations(db: DbLike, f: Omit<Filters, 'limit' | 'offset'>) {
  const [row] = await db.select({ value: count() }).from(mapLocations).leftJoin(mapLocationTranslations, enJoin).where(whereFor(f))
  return Number(row?.value ?? 0)
}
export async function getLocation(db: DbLike, id: number) {
  const [row] = await db.select().from(mapLocations).where(eq(mapLocations.id, id)).limit(1)
  return row ?? null
}
export async function getLocationTranslations(db: DbLike, id: number) {
  return db.select().from(mapLocationTranslations).where(eq(mapLocationTranslations.locationId, id))
}
export function localizedLocationRow(row: Row, text?: TextRow | null): Row { return text ? { ...row, name: text.name, shortDescription: text.shortDescription, altText: text.altText } : row }
export async function listLocalizedLocations(db: DbLike, f: Filters & { locale?: SupportedLocale }) {
  const locale = f.locale ?? DEFAULT_LOCALE
  const query = db.select({ row: mapLocations, text: mapLocationTranslations }).from(mapLocations)
    .leftJoin(mapLocationTranslations, and(eq(mapLocationTranslations.locationId, mapLocations.id), eq(mapLocationTranslations.locale, locale)))
    .where(and(whereFor({ ...f, active: 'true', search: undefined, translation: undefined }), locale === DEFAULT_LOCALE ? undefined : complete(),
      f.search ? or(textSearch(f.search), locale === DEFAULT_LOCALE ? and(sql`${mapLocationTranslations.id} is null`, or(ilike(mapLocations.name, `%${f.search}%`), ilike(mapLocations.shortDescription, `%${f.search}%`), ilike(mapLocations.altText, `%${f.search}%`))) : undefined) : undefined,
    )).orderBy(asc(mapLocations.sortOrder), asc(sql`coalesce(${mapLocationTranslations.name}, ${mapLocations.name})`), asc(mapLocations.id))
  if (f.limit !== undefined) query.limit(f.limit)
  if (f.offset !== undefined) query.offset(f.offset)
  return (await query).map(({ row, text }) => localizedLocationRow(row, text))
}
export async function getActiveLocation(db: DbLike, id: number, locale: SupportedLocale = DEFAULT_LOCALE) {
  const [found] = await db.select({ row: mapLocations, text: mapLocationTranslations }).from(mapLocations)
    .leftJoin(mapLocationTranslations, and(eq(mapLocationTranslations.locationId, mapLocations.id), eq(mapLocationTranslations.locale, locale)))
    .where(and(eq(mapLocations.id, id), eq(mapLocations.isActive, true), locale === DEFAULT_LOCALE ? undefined : complete())).limit(1)
  return found ? localizedLocationRow(found.row, found.text) : null
}
function masterValues(input: LocationInput) {
  return { ...input.translations.id, city: input.city, category: input.category, latitude: String(input.latitude), longitude: String(input.longitude), googleMapsUrl: input.googleMapsUrl, imageUrl: input.imageUrl, imageFileId: input.imageFileId, tags: input.tags, sortOrder: input.sortOrder, isActive: input.isActive, updatedAt: new Date() }
}
async function writeTranslations(db: DbLike, id: number, input: LocationInput) {
  for (const [locale, text] of Object.entries(input.translations)) {
    if (!text) continue
    const values = { ...text, updatedAt: new Date() }
    await db.insert(mapLocationTranslations).values({ locationId: id, locale, ...values }).onConflictDoUpdate({ target: [mapLocationTranslations.locationId, mapLocationTranslations.locale], set: values })
  }
}
export async function createLocation(db: DbLike, input: LocationInput) {
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(mapLocations).values({ ...masterValues(input) }).returning()
    await writeTranslations(tx, row.id, input)
    return row
  })
}
export async function updateLocation(db: DbLike, id: number, input: LocationInput) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(mapLocations).where(eq(mapLocations.id, id)).limit(1).for('update')
    if (!existing) return null
    const [row] = await tx.update(mapLocations).set({ ...masterValues(input) }).where(eq(mapLocations.id, id)).returning()
    await writeTranslations(tx, id, input)
    return row
  })
}
export async function deleteLocation(db: DbLike, id: number) {
  const [row] = await db.delete(mapLocations).where(eq(mapLocations.id, id)).returning({ id: mapLocations.id })
  return row ?? null
}
