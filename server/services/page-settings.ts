import { createError } from 'h3'
import { and, eq, inArray } from 'drizzle-orm'
import type { z } from 'zod'
import { articles, articleTranslations, mediaPageSettings, mediaPageSettingsTranslations } from '../db/schema'
import type { DbLike } from '../db'
import { type pageSettingsInput, homePageSettingsInput } from '../utils/validators'
import { DEFAULT_LOCALE, type SupportedLocale } from '../../shared/locales'
import { isCompleteHomeTranslation, type HomeTranslation } from '../../shared/media-localization'
import { isCompleteArticleTranslation } from '../../shared/article-localization'

export type PageSettingsInput = z.output<typeof pageSettingsInput>
export type HomePageSettingsInput = z.output<typeof homePageSettingsInput>
export async function getPageSettings(db: DbLike, pageKey: string) {
  const [row] = await db.select().from(mediaPageSettings).where(eq(mediaPageSettings.pageKey, pageKey)).limit(1)
  return row ?? null
}
export async function getHomeTranslations(db: DbLike, id: number) {
  return db.select().from(mediaPageSettingsTranslations).where(eq(mediaPageSettingsTranslations.pageSettingsId, id))
}
function legacyHomeText(row: typeof mediaPageSettings.$inferSelect): HomeTranslation {
  return { heroHeadline: row.heroHeadline, heroSubheadline: row.heroSubheadline, heroTopicLabels: Object.fromEntries((row.heroTopicOverride ?? []).map((t) => [t.id, t.label])) }
}
export async function getHomeSettings(db: DbLike) {
  const row = await getPageSettings(db, 'home')
  if (!row) return null
  const texts = await getHomeTranslations(db, row.id)
  const idText = texts.find((t) => t.locale === DEFAULT_LOCALE) ?? legacyHomeText(row)
  return {
    ...row, heroHeadline: idText.heroHeadline, heroSubheadline: idText.heroSubheadline,
    heroTopicOverride: row.heroTopicOverride?.map((t) => ({ ...t, label: idText.heroTopicLabels[t.id] ?? '' })) ?? null,
    translations: Object.fromEntries(texts.map((t) => [t.locale, { ...t, complete: t.locale === DEFAULT_LOCALE || isCompleteHomeTranslation(t, row.heroTopicOverride) }])),
  }
}
async function validateSlots(db: DbLike, input: Pick<PageSettingsInput, 'featuredArticleId' | 'supportingArticleIds' | 'editorialArticleIds'>) {
  const ids = [...(input.featuredArticleId ? [input.featuredArticleId] : []), ...input.supportingArticleIds, ...input.editorialArticleIds]
  if (new Set(ids).size !== ids.length) throw createError({ statusCode: 400, statusMessage: 'Artikel tidak boleh duplikat dalam slot pengaturan.' })
  const rows = ids.length ? await db.select({ id: articles.id }).from(articles).where(and(inArray(articles.id, ids), eq(articles.status, 'PUBLISHED'))) : []
  if (rows.length !== ids.length) throw createError({ statusCode: 400, statusMessage: 'Semua artikel yang dipilih harus sudah PUBLISHED.' })
}
// Existing Makkah/Madinah writers remain Indonesian-only.
export async function savePageSettings(db: DbLike, pageKey: string, input: PageSettingsInput) {
  if (pageKey === 'home') return saveHomePageSettings(db, homePageSettingsInput.parse(input))
  await validateSlots(db, input)
  const values = { ...input, featuredArticleId: input.featuredArticleId ?? null, updatedAt: new Date() }
  const [row] = await db.insert(mediaPageSettings).values({ ...values, pageKey }).onConflictDoUpdate({ target: mediaPageSettings.pageKey, set: values }).returning()
  return row
}
export async function saveHomePageSettings(db: DbLike, input: HomePageSettingsInput) {
  return db.transaction(async (tx) => {
    await validateSlots(tx, input)
    const idText = input.translations.id
    const values = {
      heroImageUrl: input.heroImageUrl, heroImageFileId: input.heroImageFileId,
      heroHeadline: idText.heroHeadline, heroSubheadline: idText.heroSubheadline,
      heroTopicOverride: input.heroTopicOverride?.map((t) => ({ ...t, label: idText.heroTopicLabels[t.id] })) ?? null,
      featuredArticleId: input.featuredArticleId ?? null, supportingArticleIds: input.supportingArticleIds,
      editorialArticleIds: input.editorialArticleIds, updatedAt: new Date(),
    }
    const [row] = await tx.insert(mediaPageSettings).values({ ...values, pageKey: 'home' })
      .onConflictDoUpdate({ target: mediaPageSettings.pageKey, set: values }).returning()
    for (const [locale, text] of Object.entries(input.translations)) {
      if (!text) continue
      const localized = { ...text, heroTopicLabels: Object.fromEntries((input.heroTopicOverride ?? []).filter((t) => text.heroTopicLabels[t.id] !== undefined).map((t) => [t.id, text.heroTopicLabels[t.id]])), updatedAt: new Date() }
      await tx.insert(mediaPageSettingsTranslations).values({ pageSettingsId: row.id, locale, ...localized })
        .onConflictDoUpdate({ target: [mediaPageSettingsTranslations.pageSettingsId, mediaPageSettingsTranslations.locale], set: localized })
    }
    return getHomeSettings(tx)
  })
}
function defaultSettings(pageKey: string) {
  return { pageKey, heroImageUrl: null as string | null, heroHeadline: null as string | null, heroSubheadline: null as string | null,
    heroTopicOverride: null as Array<{ id: string; label: string; isActive: boolean; sortOrder: number }> | null,
    featuredArticleId: null as number | null, supportingArticleIds: [] as number[], editorialArticleIds: [] as number[] }
}
export async function publicPageSettings(db: DbLike, pageKey: string, locale: SupportedLocale = DEFAULT_LOCALE) {
  const row = await getPageSettings(db, pageKey)
  const defaults = defaultSettings(pageKey)
  if (!row) return { ...defaults, locale, translationAvailable: locale === DEFAULT_LOCALE, availableLocales: [DEFAULT_LOCALE] }
  const ids = Array.from(new Set([...(row.featuredArticleId ? [row.featuredArticleId] : []), ...row.supportingArticleIds, ...row.editorialArticleIds]))
  const available = ids.length ? await db.select({ id: articles.id, text: articleTranslations }).from(articles)
    .leftJoin(articleTranslations, and(eq(articleTranslations.articleId, articles.id), eq(articleTranslations.locale, locale)))
    .where(and(inArray(articles.id, ids), eq(articles.status, 'PUBLISHED'))) : []
  const validIds = new Set(available.filter((a) => locale === DEFAULT_LOCALE || isCompleteArticleTranslation(a.text)).map((a) => a.id))
  let localized = legacyHomeText(row)
  let translationAvailable = locale === DEFAULT_LOCALE
  let availableLocales: string[] = [DEFAULT_LOCALE]
  if (pageKey === 'home') {
    const texts = await getHomeTranslations(db, row.id)
    const text = texts.find((t) => t.locale === locale)
    translationAvailable = locale === DEFAULT_LOCALE || isCompleteHomeTranslation(text, row.heroTopicOverride)
    localized = text ?? (locale === DEFAULT_LOCALE ? localized : { heroHeadline: null, heroSubheadline: null, heroTopicLabels: {} })
    availableLocales = [DEFAULT_LOCALE, ...texts.filter((t) => t.locale !== DEFAULT_LOCALE && isCompleteHomeTranslation(t, row.heroTopicOverride)).map((t) => t.locale)]
  }
  return {
    ...defaults, heroImageUrl: row.heroImageUrl, locale, translationAvailable, availableLocales,
    heroHeadline: translationAvailable ? localized.heroHeadline : null,
    heroSubheadline: translationAvailable ? localized.heroSubheadline : null,
    heroTopicOverride: translationAvailable ? row.heroTopicOverride?.map((t) => ({ ...t, label: localized.heroTopicLabels[t.id] ?? '' })) ?? null : null,
    featuredArticleId: row.featuredArticleId && validIds.has(row.featuredArticleId) ? row.featuredArticleId : null,
    supportingArticleIds: row.supportingArticleIds.filter((id) => validIds.has(id)),
    editorialArticleIds: row.editorialArticleIds.filter((id) => validIds.has(id)),
  }
}
