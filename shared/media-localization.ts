import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from './locales'
import type { ArticleBlock } from './article-localization'

export type GuideTranslation = { title: string; slug: string | null; summary: string | null; body: ArticleBlock[] }
export type GalleryTranslation = { title: string | null; description: string | null; altText: string; locationName: string | null }
export type LocationTranslation = { name: string; shortDescription: string; altText: string | null }
export type HomeTranslation = { heroHeadline: string | null; heroSubheadline: string | null; heroTopicLabels: Record<string, string> }
export type TopicStructure = { id: string; isActive: boolean; sortOrder: number }
export type TranslationReadiness = 'complete' | 'incomplete'

export function isCompleteGuideTranslation(t: { title?: string; slug?: string | null; body?: unknown[] } | null | undefined) {
  return Boolean(t?.title?.trim() && t.slug?.trim() && Array.isArray(t.body) && t.body.length)
}
export function isCompleteGalleryTranslation(t: { altText?: string | null } | null | undefined) {
  // Title, description and location caption are optional in the existing Gallery.
  return Boolean(t?.altText?.trim())
}
export function isCompleteLocationTranslation(t: { name?: string; shortDescription?: string } | null | undefined) {
  return Boolean(t?.name?.trim() && t.shortDescription?.trim())
}
export function isCompleteHomeTranslation(t: Partial<HomeTranslation> | null | undefined, topics: TopicStructure[] | null) {
  return Boolean(t?.heroHeadline?.trim() && t.heroSubheadline?.trim()
    && (topics ?? []).filter((topic) => topic.isActive).every((topic) => { const label = t.heroTopicLabels?.[topic.id]; return typeof label === 'string' && Boolean(label.trim()) }))
}

/** Preserve explicit null/empty translations; fallback only for unmigrated ID rows. */
export function mediaEditorTranslation<T>(row: { translations?: Partial<Record<SupportedLocale, Partial<T>>> }, locale: SupportedLocale, legacy: T, empty: T): T {
  return JSON.parse(JSON.stringify({ ...empty, ...(row.translations?.[locale] ?? (locale === DEFAULT_LOCALE ? legacy : {})) })) as T
}

export function mediaLocaleLinks<T extends { locale: string; slug?: string | null }>(translations: T[], complete: (t: T) => boolean) {
  const available = translations.filter((t) => SUPPORTED_LOCALES.includes(t.locale as SupportedLocale) && (t.locale === DEFAULT_LOCALE || complete(t)))
  return {
    availableLocales: available.map((t) => t.locale),
    ...(translations.some((t) => 'slug' in t) ? { localizedSlugs: Object.fromEntries(available.filter((t) => t.slug).map((t) => [t.locale, t.slug])) } : {}),
  }
}
