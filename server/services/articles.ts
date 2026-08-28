import { and, count, desc, eq, ilike, or } from 'drizzle-orm'
import { articles } from '../db/schema'
import type { DbLike } from '../db'

export type ArticleInput = {
  title: string
  slug: string
  excerpt: string
  heroImage: string
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
  const rows = await db.insert(articles).values({ ...input, publishedAt: input.status === 'PUBLISHED' ? input.publishedAt ?? new Date() : null, updatedAt: new Date() }).returning()
  return rows[0]
}

export async function updateArticle(db: DbLike, id: number, input: ArticleInput) {
  const existing = await getArticle(db, id)
  if (!existing) return null
  const publishedAt = input.status === 'PUBLISHED' ? input.publishedAt ?? existing.publishedAt ?? new Date() : null
  const rows = await db.update(articles).set({ ...input, publishedAt, updatedAt: new Date() }).where(eq(articles.id, id)).returning()
  return rows[0] ?? null
}

export async function updateArticleStatus(db: DbLike, id: number, status: string) {
  const existing = await getArticle(db, id)
  if (!existing) return null
  const rows = await db.update(articles).set({ status, publishedAt: status === 'PUBLISHED' ? existing.publishedAt ?? new Date() : null, updatedAt: new Date() }).where(eq(articles.id, id)).returning()
  return rows[0] ?? null
}
