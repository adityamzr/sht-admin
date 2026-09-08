import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { eq } from 'drizzle-orm'
import * as schema from '../server/db/schema'
import type { DbLike } from '../server/db'
import { ARTICLE_CONTENT_TYPES, ARTICLE_CATEGORIES } from '../server/db/schema'
import { articleInput } from '../server/utils/validators'
import { createArticle, updateArticle, listArticles, getArticle } from '../server/services/articles'
import { publicArticle, adminArticle } from '../server/utils/serializers'

const expectedContentTypes = [
  'article',
  'explainer',
  'guide',
  'how_to',
  'analysis',
  'news',
  'editorial',
  'faq',
  'comparison',
  'story_feature',
] as const

const expectedCategories = [
  'Ibadah',
  'Panduan',
  'Kehidupan',
  'Sosial',
  'Ekonomi',
  'Bisnis',
  'Kuliner',
  'Transportasi',
  'Akomodasi',
  'Makkah',
  'Madinah',
  'Budaya',
  'Sejarah',
  'Berita / Update',
  'Sains & Teknologi',
  'Hiburan & Permainan',
  'Gaya Hidup',
  'Komunitas',
  'Lainnya',
] as const

function fixture(contentType = 'article', slug = 'test-article'): any {
  const safeSlug = slug.replace(/_/g, '-')
  return articleInput.parse({
    heroImage: '/hero.jpg',
    heroImageFileId: 'file-123',
    city: 'GENERAL',
    contentType,
    category: 'Kehidupan',
    tags: ['test'],
    status: 'DRAFT',
    priority: 0,
    translations: {
      id: {
        title: 'Judul Test',
        slug: safeSlug,
        excerpt: 'Excerpt test',
        heroAlt: 'Alt test',
        body: [{ type: 'paragraph', text: 'Body test' }],
        seoTitle: null,
        seoDescription: null,
      },
    },
  })
}

describe('Article Content Type expansion', () => {
  it('has exactly 10 editorial content types', () => {
    assert.deepEqual([...ARTICLE_CONTENT_TYPES], [...expectedContentTypes])
    assert.equal(ARTICLE_CONTENT_TYPES.length, 10)
  })

  it('existing category list unchanged', () => {
    assert.deepEqual([...ARTICLE_CATEGORIES], [...expectedCategories])
    assert.equal(ARTICLE_CATEGORIES.length, 19)
  })

  it('all new content types are valid via validator', () => {
    for (const ct of expectedContentTypes) {
      const safeSlug = `slug-${ct}`.replace(/_/g, '-')
      const parsed = articleInput.safeParse({
        heroImage: '',
        city: 'GENERAL',
        contentType: ct,
        category: 'Kehidupan',
        tags: [],
        status: 'DRAFT',
        priority: 0,
        translations: {
          id: { title: 'Judul', slug: safeSlug, excerpt: '', heroAlt: '', body: [] },
        },
      })
      assert.equal(parsed.success, true, `contentType ${ct} should be valid`)
    }
  })

  it('invalid content type is rejected', () => {
    const invalid = ['article_old', 'update', 'practical', 'random', '', null, undefined]
    for (const ct of invalid) {
      const res = articleInput.safeParse({
        heroImage: '',
        city: 'GENERAL',
        contentType: ct as any,
        category: 'Kehidupan',
        tags: [],
        status: 'DRAFT',
        priority: 0,
        translations: {
          id: { title: 'Judul', slug: 'judul-invalid', excerpt: '', heroAlt: '', body: [] },
        },
      })
      assert.equal(res.success, false, `contentType ${String(ct)} should be rejected`)
    }
  })

  it('default content type for new article is article', () => {
    // Empty form default in UI is 'article', schema default is 'article'
    assert.equal(schema.articles.contentType.default, 'article')
  })

  it('migration file exists and contains legacy mappings', async () => {
    const sql = await readFile(new URL('../server/db/migrations/0018_article_content_types.sql', import.meta.url), 'utf8')
    assert.match(sql, /update/i)
    assert.match(sql, /'news'.*'update'/i)
    assert.match(sql, /'guide'.*'practical'/i)
    // Ensure idempotent pattern
    assert.match(sql, /WHERE.*content_type.*=.*'update'/)
    assert.match(sql, /WHERE.*content_type.*=.*'practical'/)
  })

  it('public serializer still returns contentType field', () => {
    const row = {
      id: 1,
      slug: 'test',
      title: 'Test',
      excerpt: '',
      heroImage: '',
      heroImageAlt: '',
      body: [],
      city: 'GENERAL',
      contentType: 'explainer',
      category: 'Kehidupan',
      tags: [],
      publishedAt: null,
      updatedAt: new Date(),
      seoTitle: null,
      seoDescription: null,
      ogImage: null,
    } as any
    const pub = publicArticle(row)
    assert.equal(pub.contentType, 'explainer')
    assert.equal('contentType' in pub, true)
  })

  it('admin serializer still returns contentType field', () => {
    const row = {
      id: 1,
      title: 'Test',
      slug: 'test',
      excerpt: '',
      heroImage: '',
      heroImageFileId: null,
      heroImageAlt: '',
      body: [],
      city: 'GENERAL',
      contentType: 'how_to',
      category: 'Kehidupan',
      tags: [],
      status: 'DRAFT',
      priority: 0,
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      seoTitle: null,
      seoDescription: null,
      ogImage: null,
    } as any
    const admin = adminArticle(row)
    assert.equal(admin.contentType, 'how_to')
  })
})

describe('Article Content Type DB operations', { concurrency: false }, () => {
  let client: PGlite
  let db: DbLike

  before(async () => {
    client = await PGlite.create()
    const journal = JSON.parse(await readFile(new URL('../server/db/migrations/meta/_journal.json', import.meta.url), 'utf8'))
    for (const entry of journal.entries) {
      await client.exec(await readFile(new URL(`../server/db/migrations/${entry.tag}.sql`, import.meta.url), 'utf8'))
    }
    db = drizzle(client, { schema }) as unknown as DbLike
  })

  beforeEach(async () => {
    await db.delete(schema.articles)
  })

  after(async () => {
    await client?.close()
  })

  it('create article can store all new content types', async () => {
    for (const ct of expectedContentTypes) {
      await db.delete(schema.articles)
      const input = fixture(ct, `slug-${ct}`)
      const row = await createArticle(db, input)
      assert.equal(row.contentType, ct)
      const fetched = await getArticle(db, row.id)
      assert.equal(fetched?.contentType, ct)
    }
  })

  it('update article does not reset content type', async () => {
    const input = fixture('explainer', 'original-slug')
    const row = await createArticle(db, input)
    assert.equal(row.contentType, 'explainer')

    const updatedInput = fixture('analysis', 'original-slug')
    // Keep same slug to avoid 409 on published, but status DRAFT allows same slug
    updatedInput.translations.id.title = 'Updated Title'
    const updated = await updateArticle(db, row.id, updatedInput)
    assert.equal(updated?.contentType, 'analysis')
    assert.equal(updated?.title, 'Updated Title')

    // Update again keeping same contentType
    const secondUpdate = fixture('analysis', 'original-slug')
    secondUpdate.translations.id.title = 'Second Update'
    const second = await updateArticle(db, row.id, secondUpdate)
    assert.equal(second?.contentType, 'analysis')
  })

  it('filter contentType works', async () => {
    await createArticle(db, fixture('article', 'filter-article-1'))
    await createArticle(db, fixture('guide', 'filter-guide-2'))
    await createArticle(db, fixture('news', 'filter-news-3'))
    await createArticle(db, fixture('faq', 'filter-faq-4'))

    const guides = await listArticles(db, { contentType: 'guide' })
    assert.equal(guides.length, 1)
    assert.equal(guides[0].contentType, 'guide')

    const news = await listArticles(db, { contentType: 'news' })
    assert.equal(news.length, 1)
    assert.equal(news[0].contentType, 'news')

    const all = await listArticles(db, {})
    assert.equal(all.length, 4)
  })

  it('legacy update migrates to news', async () => {
    // Simulate legacy data before migration
    await client.exec(`INSERT INTO articles (title, slug, excerpt, hero_image, hero_image_alt, body, city, content_type, category, tags, status, priority) VALUES ('Legacy Update', 'legacy-update', '', '', '', '[]', 'GENERAL', 'update', 'Kehidupan', '[]', 'DRAFT', 0)`)
    let rows = await db.select().from(schema.articles)
    assert.equal(rows[0].contentType, 'update')

    // Run migration SQL
    const migrationSql = await readFile(new URL('../server/db/migrations/0018_article_content_types.sql', import.meta.url), 'utf8')
    await client.exec(migrationSql)

    rows = await db.select().from(schema.articles)
    assert.equal(rows[0].contentType, 'news')
  })

  it('legacy practical migrates to guide', async () => {
    await client.exec(`INSERT INTO articles (title, slug, excerpt, hero_image, hero_image_alt, body, city, content_type, category, tags, status, priority) VALUES ('Legacy Practical', 'legacy-practical', '', '', '', '[]', 'GENERAL', 'practical', 'Kehidupan', '[]', 'DRAFT', 0)`)
    let rows = await db.select().from(schema.articles)
    assert.equal(rows[0].contentType, 'practical')

    const migrationSql = await readFile(new URL('../server/db/migrations/0018_article_content_types.sql', import.meta.url), 'utf8')
    await client.exec(migrationSql)

    rows = await db.select().from(schema.articles)
    assert.equal(rows[0].contentType, 'guide')
  })

  it('migration is idempotent', async () => {
    await client.exec(`INSERT INTO articles (title, slug, excerpt, hero_image, hero_image_alt, body, city, content_type, category, tags, status, priority) VALUES ('Test', 'test-idempotent', '', '', '', '[]', 'GENERAL', 'update', 'Kehidupan', '[]', 'DRAFT', 0)`)
    const migrationSql = await readFile(new URL('../server/db/migrations/0018_article_content_types.sql', import.meta.url), 'utf8')
    await client.exec(migrationSql)
    await client.exec(migrationSql) // second run
    const rows = await db.select().from(schema.articles)
    assert.equal(rows[0].contentType, 'news')
  })

  it('existing category unchanged after content type operations', async () => {
    const input = fixture('story_feature', 'cat-test')
    input.category = 'Sains & Teknologi'
    const row = await createArticle(db, input)
    assert.equal(row.category, 'Sains & Teknologi')
    assert.equal(row.contentType, 'story_feature')
  })

  it('localization ID/EN still works with new content types', async () => {
    const input = articleInput.parse({
      heroImage: '/hero.jpg',
      city: 'MAKKAH',
      contentType: 'explainer',
      category: 'Ibadah',
      tags: [],
      status: 'PUBLISHED',
      priority: 0,
      translations: {
        id: { title: 'Judul ID', slug: 'judul-id', excerpt: 'Excerpt ID', heroAlt: 'Alt ID', body: [] },
        en: { title: 'English Title', slug: 'english-title', excerpt: 'English excerpt', heroAlt: 'English alt', body: [] },
      },
    }) as any
    const row = await createArticle(db, input)
    assert.equal(row.contentType, 'explainer')
    const trans = await db.select().from(schema.articleTranslations).where(eq(schema.articleTranslations.articleId, row.id))
    assert.equal(trans.length, 2)
    assert.ok(row.id)
  })
})
