import { and, count, desc, eq, ilike, not, or, sql } from 'drizzle-orm'
import { createError } from 'h3'
import type { z } from 'zod'
import { articles, articleTranslations } from '../db/schema'
import type { DbLike } from '../db'
import type { articleInput } from '../utils/validators'
import { DEFAULT_LOCALE, type SupportedLocale } from '../../shared/locales'
import { isCompleteArticleTranslation, type ArticleTranslationInput } from '../../shared/article-localization'

export { isCompleteArticleTranslation, type ArticleTranslationInput } from '../../shared/article-localization'
export type ArticleInput = Omit<z.output<typeof articleInput>, 'publishedAt'> & { publishedAt?: Date | null }
type ArticleRow = typeof articles.$inferSelect
type TranslationRow = typeof articleTranslations.$inferSelect
type ArticleFilters = { search?: string; status?: string; city?: string; category?: string; limit?: number; offset?: number }

function conditionsFor(filters: ArticleFilters) {
  const conditions = []
  if (filters.status) conditions.push(eq(articles.status, filters.status))
  if (filters.city) conditions.push(eq(articles.city, filters.city))
  if (filters.category) conditions.push(eq(articles.category, filters.category))
  if (filters.search) conditions.push(or(ilike(articles.title, `%${filters.search}%`), ilike(articles.slug, `%${filters.search}%`), ilike(articles.category, `%${filters.search}%`)))
  return and(...conditions)
}

function articleOrder() {
  return [desc(articles.priority), desc(articles.publishedAt), desc(articles.updatedAt), desc(articles.id)]
}

// Same readiness rule as the shared UI/serializer helper. COALESCE also covers
// articles with no EN translation in a LEFT JOIN (they are incomplete).
function completeTranslationCondition() {
  const whitespace = ' \t\n\r\f\v\u00a0\ufeff\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000'
  return sql<boolean>`coalesce(
    length(btrim(${articleTranslations.title}, ${whitespace})) > 0
    and length(btrim(${articleTranslations.slug}, ${whitespace})) > 0
    and length(btrim(${articleTranslations.excerpt}, ${whitespace})) > 0
    and case when jsonb_typeof(${articleTranslations.body}) = 'array'
      then jsonb_array_length(${articleTranslations.body}) > 0 else false end,
    false)`
}

function translationSearch(search: string) {
  const needle = `%${search}%`
  return or(ilike(articleTranslations.title, needle), ilike(articleTranslations.slug, needle), ilike(articleTranslations.excerpt, needle))
}

export async function listArticles(db: DbLike, filters: ArticleFilters) {
  const query = db.select().from(articles).where(conditionsFor(filters)).orderBy(...articleOrder())
  if (filters.limit !== undefined) query.limit(filters.limit)
  if (filters.offset !== undefined) query.offset(filters.offset)
  return query
}

export async function countArticles(db: DbLike, filters: Omit<ArticleFilters, 'limit' | 'offset'>) {
  const rows = await db.select({ value: count() }).from(articles).where(conditionsFor(filters))
  return Number(rows[0]?.value ?? 0)
}

export async function getArticle(db: DbLike, id: number) {
  const rows = await db.select().from(articles).where(eq(articles.id, id)).limit(1)
  return rows[0] ?? null
}

export async function getPublishedArticleBySlug(db: DbLike, slug: string) {
  const rows = await db.select().from(articles).where(and(eq(articles.slug, slug), eq(articles.status, 'PUBLISHED'))).limit(1)
  return rows[0] ?? null
}

export async function slugExists(db: DbLike, slug: string, excludeId?: number) {
  const rows = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, slug)).limit(2)
  return rows.some((row) => row.id !== excludeId)
}

function masterValues(input: ArticleInput) {
  const text = input.translations.id
  return {
    title: text.title, slug: text.slug, excerpt: text.excerpt,
    heroImageAlt: text.heroAlt, body: text.body,
    seoTitle: text.seoTitle, seoDescription: text.seoDescription,
    heroImage: input.heroImage, heroImageFileId: input.heroImageFileId,
    city: input.city, contentType: input.contentType, category: input.category,
    tags: input.tags, status: input.status, priority: input.priority, ogImage: input.ogImage,
    updatedAt: new Date(),
  }
}

function duplicateSlugError() {
  return createError({ statusCode: 409, statusMessage: 'Slug sudah digunakan artikel lain.' })
}

// The constraint remains the final arbiter if two requests pass the precheck.
function rethrowArticleWriteError(error: unknown): never {
  let cause = error
  while (cause && typeof cause === 'object') {
    if ('code' in cause && cause.code === '23505') throw duplicateSlugError()
    cause = 'cause' in cause ? cause.cause : undefined
  }
  throw error
}

async function validateSlugs(db: DbLike, input: ArticleInput, excludeId?: number) {
  if (await slugExists(db, input.translations.id.slug, excludeId)) throw duplicateSlugError()
  for (const [locale, translation] of Object.entries(input.translations)) {
    if (translation && await localizedSlugExists(db, locale as SupportedLocale, translation.slug, excludeId)) throw duplicateSlugError()
  }
}

async function writeTranslations(db: DbLike, id: number, input: ArticleInput) {
  for (const [locale, translation] of Object.entries(input.translations)) {
    if (translation) await upsertArticleTranslation(db, id, locale as SupportedLocale, translation)
  }
}

export async function createArticle(db: DbLike, input: ArticleInput) {
  try {
    return await db.transaction(async (tx) => {
      await validateSlugs(tx, input)
      const [row] = await tx.insert(articles).values({
        ...masterValues(input),
        publishedAt: input.status === 'PUBLISHED' ? input.publishedAt ?? new Date() : null,
      }).returning()
      await writeTranslations(tx, row.id, input)
      return row
    })
  } catch (error) { rethrowArticleWriteError(error) }
}

export async function updateArticle(db: DbLike, id: number, input: ArticleInput) {
  try {
    return await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(articles).where(eq(articles.id, id)).limit(1).for('update')
      if (!existing) return null
      const translations = await getArticleTranslations(tx, id)
      const idText = translations.find((t) => t.locale === DEFAULT_LOCALE)
      if (existing.status === 'PUBLISHED' && (idText?.slug ?? existing.slug) !== input.translations.id.slug) {
        throw createError({ statusCode: 409, statusMessage: 'Slug artikel terbit tidak dapat diubah.' })
      }
      await validateSlugs(tx, input, id)
      const [row] = await tx.update(articles).set({
        ...masterValues(input),
        publishedAt: input.status === 'PUBLISHED' ? input.publishedAt ?? existing.publishedAt ?? new Date() : null,
      }).where(eq(articles.id, id)).returning()
      await writeTranslations(tx, id, input)
      return row
    })
  } catch (error) { rethrowArticleWriteError(error) }
}

export async function updateArticleStatus(db: DbLike, id: number, status: string) {
  const existing = await getArticle(db, id)
  if (!existing) return null
  const rows = await db.update(articles).set({ status, publishedAt: status === 'PUBLISHED' ? existing.publishedAt ?? new Date() : null, updatedAt: new Date() }).where(eq(articles.id, id)).returning()
  return rows[0] ?? null
}

export async function deleteArticle(db: DbLike, id: number) {
  const rows = await db.delete(articles).where(eq(articles.id, id)).returning({ id: articles.id })
  return rows[0] ?? null
}

export async function getArticleTranslations(db: DbLike, articleId: number) {
  return db.select().from(articleTranslations).where(eq(articleTranslations.articleId, articleId))
}

export async function getArticleWithTranslations(db: DbLike, id: number) {
  const article = await getArticle(db, id)
  return article ? { article, translations: await getArticleTranslations(db, id) } : null
}

async function upsertArticleTranslation(db: DbLike, articleId: number, locale: SupportedLocale, input: ArticleTranslationInput) {
  const values = {
    title: input.title ?? '', slug: input.slug || null, excerpt: input.excerpt ?? '',
    heroAlt: input.heroAlt ?? '', body: input.body ?? [],
    seoTitle: input.seoTitle ?? null, seoDescription: input.seoDescription ?? null,
    updatedAt: new Date(),
  }
  const [row] = await db.insert(articleTranslations).values({ articleId, locale, ...values })
    .onConflictDoUpdate({ target: [articleTranslations.articleId, articleTranslations.locale], set: values }).returning()
  return row
}

export async function getPublishedArticleByLocalizedSlug(db: DbLike, slug: string, locale: SupportedLocale = DEFAULT_LOCALE) {
  const [row] = await db.select({ article: articles, translation: articleTranslations }).from(articleTranslations)
    .innerJoin(articles, eq(articleTranslations.articleId, articles.id))
    .where(and(eq(articleTranslations.locale, locale), eq(articleTranslations.slug, slug), eq(articles.status, 'PUBLISHED'))).limit(1)
  if (!row || (locale !== DEFAULT_LOCALE && !isCompleteArticleTranslation(row.translation))) return null
  return row
}

export function localizedArticleRow(article: ArticleRow, translation: TranslationRow): ArticleRow {
  return { ...article, title: translation.title, slug: translation.slug ?? '', excerpt: translation.excerpt, heroImageAlt: translation.heroAlt, body: translation.body, seoTitle: translation.seoTitle, seoDescription: translation.seoDescription }
}

export async function listLocalizedArticles(db: DbLike, filters: ArticleFilters & { locale?: SupportedLocale }) {
  const locale = filters.locale ?? DEFAULT_LOCALE
  const query = db.select({ article: articles, translation: articleTranslations }).from(articleTranslations)
    .innerJoin(articles, eq(articleTranslations.articleId, articles.id))
    .where(and(
      conditionsFor({ ...filters, status: 'PUBLISHED', search: undefined }),
      eq(articleTranslations.locale, locale),
      locale !== DEFAULT_LOCALE ? completeTranslationCondition() : undefined,
      filters.search ? translationSearch(filters.search) : undefined,
    )).orderBy(...articleOrder())
  if (filters.limit !== undefined) query.limit(filters.limit)
  if (filters.offset !== undefined) query.offset(filters.offset)
  const rows = await query
  return rows.map(({ article, translation }) => localizedArticleRow(article, translation))
}

export async function localizedSlugExists(db: DbLike, locale: SupportedLocale, slug: string | null | undefined, excludeArticleId?: number) {
  if (!slug) return false
  const rows = await db.select({ articleId: articleTranslations.articleId }).from(articleTranslations)
    .where(and(eq(articleTranslations.locale, locale), eq(articleTranslations.slug, slug))).limit(2)
  return rows.some((row) => row.articleId !== excludeArticleId)
}

export async function listArticlesByTranslationReadiness(db: DbLike, filters: ArticleFilters, readiness: 'complete' | 'incomplete', limit: number, offset: number) {
  const join = and(eq(articleTranslations.articleId, articles.id), eq(articleTranslations.locale, 'en'))
  const condition = and(
    conditionsFor({ ...filters, search: undefined }),
    readiness === 'complete' ? completeTranslationCondition() : not(completeTranslationCondition()),
    filters.search ? or(conditionsFor({ search: filters.search }), translationSearch(filters.search)) : undefined,
  )
  const [matching, totals] = await Promise.all([
    db.select({ article: articles }).from(articles).leftJoin(articleTranslations, join)
      .where(condition).orderBy(...articleOrder()).limit(limit).offset(offset),
    db.select({ value: count() }).from(articles).leftJoin(articleTranslations, join).where(condition),
  ])
  const rows = await Promise.all(matching.map(async ({ article }) => ({ ...article, translations: await getArticleTranslations(db, article.id) })))
  return { total: Number(totals[0]?.value ?? 0), rows }
}
