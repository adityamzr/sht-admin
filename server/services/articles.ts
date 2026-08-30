import { and, count, desc, eq, ilike, or } from 'drizzle-orm'
import { articles } from '../db/schema'
import type { DbLike } from '../db'

export type ArticleInput = {
  title: string
  slug: string
  excerpt: string
  heroImage: string
  heroImageFileId?: string | null
  heroImageAlt: string
  body: unknown[]
  city: string
  contentType: string
  category: string
  tags: string[]
  status: string
  priority: number
  publishedAt?: Date | null
  seoTitle?: string | null
  seoDescription?: string | null
  ogImage?: string | null
  translations?: { id?: ArticleTranslationInput; en?: ArticleTranslationInput }
}

type ArticleFilters = { search?: string; status?: string; city?: string; category?: string; limit?: number; offset?: number }

function conditionsFor(filters: ArticleFilters) {
  const conditions = []
  if (filters.status) conditions.push(eq(articles.status, filters.status))
  if (filters.city) conditions.push(eq(articles.city, filters.city))
  if (filters.category) conditions.push(eq(articles.category, filters.category))
  if (filters.search) {
    conditions.push(or(ilike(articles.title, `%${filters.search}%`), ilike(articles.slug, `%${filters.search}%`), ilike(articles.category, `%${filters.search}%`)))
  }
  return conditions.length ? and(...conditions) : undefined
}

export async function listArticles(db: DbLike, filters: ArticleFilters) {
  const query = db.select().from(articles).where(conditionsFor(filters)).orderBy(desc(articles.priority), desc(articles.publishedAt), desc(articles.updatedAt))
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

export async function createArticle(db: DbLike, input: ArticleInput) {
  const { translations, ...master } = input as any
  const rows = await db.insert(articles).values({ ...master, publishedAt: input.status === 'PUBLISHED' ? input.publishedAt ?? new Date() : null, updatedAt: new Date() }).returning()
  if (rows[0]) await upsertArticleTranslation(db, rows[0].id, 'id', translations?.id ?? { title: input.title, slug: input.slug, excerpt: input.excerpt, heroAlt: input.heroImageAlt, body: input.body, seoTitle: input.seoTitle, seoDescription: input.seoDescription })
  if (rows[0] && translations?.en) await upsertArticleTranslation(db, rows[0].id, 'en', translations.en)
  return rows[0]
}

export async function updateArticle(db: DbLike, id: number, input: ArticleInput) {
  const existing = await getArticle(db, id)
  if (!existing) return null
  const publishedAt = input.status === 'PUBLISHED' ? input.publishedAt ?? existing.publishedAt ?? new Date() : null
  const { translations, ...master } = input as any
  const rows = await db.update(articles).set({ ...master, publishedAt, updatedAt: new Date() }).where(eq(articles.id, id)).returning()
  if (rows[0]) await upsertArticleTranslation(db, id, 'id', translations?.id ?? { title: input.title, slug: input.slug, excerpt: input.excerpt, heroAlt: input.heroImageAlt, body: input.body, seoTitle: input.seoTitle, seoDescription: input.seoDescription })
  if (rows[0] && translations?.en) await upsertArticleTranslation(db, id, 'en', translations.en)
  return rows[0] ?? null
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

export type ArticleLocale = 'id' | 'en'
export type ArticleTranslationInput = { title?: string; slug?: string | null; excerpt?: string; heroAlt?: string; body?: unknown[]; seoTitle?: string | null; seoDescription?: string | null }
export function isCompleteArticleTranslation(t: ArticleTranslationInput | null | undefined) { return Boolean(t?.title?.trim() && t.slug?.trim() && t.excerpt?.trim() && Array.isArray(t.body) && t.body.length > 0) }
export async function getArticleTranslations(db: DbLike, articleId: number) { const { articleTranslations } = await import('../db/schema'); return db.select().from(articleTranslations).where(eq(articleTranslations.articleId, articleId)) }
export async function getArticleWithTranslations(db: DbLike, id: number) { const article = await getArticle(db, id); if (!article) return null; return { article, translations: await getArticleTranslations(db, id) } }
export async function upsertArticleTranslation(db: DbLike, articleId: number, locale: ArticleLocale, input: ArticleTranslationInput) { const { articleTranslations } = await import('../db/schema'); const existing = (await db.select().from(articleTranslations).where(and(eq(articleTranslations.articleId, articleId), eq(articleTranslations.locale, locale))).limit(1))[0]; const values = { title: input.title?.trim() ?? '', slug: input.slug?.trim() || null, excerpt: input.excerpt?.trim() ?? '', heroAlt: input.heroAlt?.trim() ?? '', body: input.body ?? [], seoTitle: input.seoTitle?.trim() || null, seoDescription: input.seoDescription?.trim() || null, updatedAt: new Date() }; if (existing) { const rows = await db.update(articleTranslations).set(values).where(eq(articleTranslations.id, existing.id)).returning(); return rows[0] } const rows = await db.insert(articleTranslations).values({ articleId, locale, ...values }).returning(); return rows[0] }
export async function getPublishedArticleByLocalizedSlug(db: DbLike, slug: string, locale: ArticleLocale = 'id') { const { articleTranslations } = await import('../db/schema'); const rows = await db.select({ article: articles, translation: articleTranslations }).from(articleTranslations).innerJoin(articles, eq(articleTranslations.articleId, articles.id)).where(and(eq(articleTranslations.locale, locale), eq(articleTranslations.slug, slug), eq(articles.status, 'PUBLISHED'))).limit(1); const row = rows[0]; if (!row || !isCompleteArticleTranslation(row.translation)) return null; return row }
export function localizedArticleRow(article: any, translation: any) { return { ...article, title: translation.title, slug: translation.slug, excerpt: translation.excerpt, heroImageAlt: translation.heroAlt, body: translation.body, seoTitle: translation.seoTitle, seoDescription: translation.seoDescription } }
export async function listLocalizedArticles(db: DbLike, filters: ArticleFilters & { locale?: ArticleLocale }) { const locale=filters.locale||'id'; const rows=await listArticles(db, filters); const out=[]; for(const article of rows){ const ts=await getArticleTranslations(db,article.id); const t=ts.find(x=>x.locale===locale); if(t && (locale==='id'||isCompleteArticleTranslation(t))) out.push(localizedArticleRow(article,t)); } return out }

export async function localizedSlugExists(db: DbLike, locale: ArticleLocale, slug: string | null | undefined, excludeArticleId?: number) { if (!slug) return false; const { articleTranslations } = await import('../db/schema'); const rows=await db.select({articleId:articleTranslations.articleId}).from(articleTranslations).where(and(eq(articleTranslations.locale,locale),eq(articleTranslations.slug,slug))).limit(2); return rows.some(r=>r.articleId!==excludeArticleId) }
