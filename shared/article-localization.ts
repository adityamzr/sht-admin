import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from './locales'

export type ArticleBlock = {
  type: 'paragraph' | 'heading' | 'image' | 'blockquote' | 'list' | 'callout'
  level?: 2 | 3
  text?: string
  ordered?: boolean
  items?: string[]
  src?: string
  alt?: string
  caption?: string
  fileId?: string
}

export type ArticleTranslationInput = {
  title?: string
  slug?: string | null
  excerpt?: string
  heroAlt?: string
  body?: unknown[]
  seoTitle?: string | null
  seoDescription?: string | null
}

export function isCompleteArticleTranslation(t: ArticleTranslationInput | null | undefined) {
  return Boolean(t?.title?.trim() && t.slug?.trim() && t.excerpt?.trim() && Array.isArray(t.body) && t.body.length > 0)
}

export function articleLocaleLinks(translations: Array<ArticleTranslationInput & { locale: string }>) {
  const available = translations.filter((t) => SUPPORTED_LOCALES.includes(t.locale as SupportedLocale) && t.slug && (t.locale === DEFAULT_LOCALE || isCompleteArticleTranslation(t)))
  return {
    availableLocales: available.map((t) => t.locale),
    localizedSlugs: Object.fromEntries(available.map((t) => [t.locale, t.slug])),
  }
}

type EditorTranslation = Omit<ArticleTranslationInput, 'body'> & { body?: ArticleBlock[] }
type LegacyArticleContent = {
  title: string
  slug: string
  excerpt: string
  heroImageAlt: string
  body: ArticleBlock[]
  seoTitle?: string | null
  seoDescription?: string | null
  translations?: Partial<Record<SupportedLocale, EditorTranslation>>
}

/** Only entirely unmigrated ID content may use the legacy article fields. */
export function articleEditorTranslation(article: LegacyArticleContent, locale: SupportedLocale) {
  const translation = article.translations?.[locale] ?? (locale === 'id' ? {
    title: article.title, slug: article.slug, excerpt: article.excerpt,
    heroAlt: article.heroImageAlt, body: article.body,
    seoTitle: article.seoTitle, seoDescription: article.seoDescription,
  } : {})
  return {
    title: translation.title ?? '',
    slug: translation.slug ?? '',
    excerpt: translation.excerpt ?? '',
    heroAlt: translation.heroAlt ?? '',
    body: JSON.parse(JSON.stringify(translation.body ?? [])) as ArticleBlock[],
    seoTitle: translation.seoTitle ?? '',
    seoDescription: translation.seoDescription ?? '',
  }
}
