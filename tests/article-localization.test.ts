import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { eq } from 'drizzle-orm'
import * as schema from '../server/db/schema'
import type { DbLike } from '../server/db'
import {
  createArticle, updateArticle, getArticle, getArticleTranslations, getArticleWithTranslations,
  getPublishedArticleByLocalizedSlug, listLocalizedArticles, listArticlesByTranslationReadiness,
  type ArticleInput,
} from '../server/services/articles'
import { createArticleFeedback, getArticleFeedbackSummary } from '../server/services/article-feedback'
import { adminArticleWithTranslations } from '../server/utils/serializers'
import { articleInput } from '../server/utils/validators'
import { parseLocale } from '../server/utils/locales'
import { articleEditorTranslation, articleLocaleLinks, isCompleteArticleTranslation } from '../shared/article-localization'

const idBody = [
  { type: 'heading', level: 2, text: 'Panduan Indonesia' },
  { type: 'paragraph', text: 'Isi Indonesia yang tidak boleh tertukar.' },
  { type: 'list', ordered: true, items: ['Satu', 'Dua'] },
  { type: 'image', src: '/indonesia.jpg', alt: 'Indonesia', fileId: 'id-image' },
]
const enBody = [
  { type: 'heading', level: 3, text: 'English guide' },
  { type: 'paragraph', text: 'English body must survive a reload.' },
  { type: 'blockquote', text: 'English quote' },
  { type: 'callout', text: 'English note' },
  { type: 'list', ordered: false, items: ['One', 'Two'] },
  { type: 'image', src: '/english.jpg', alt: 'English', caption: 'Caption', fileId: 'en-image' },
]
function fixture(slug = 'panduan-id', english = true): ArticleInput {
  return articleInput.parse({
    heroImage: '/hero.jpg', heroImageFileId: 'hero-file', city: 'MAKKAH', contentType: 'article',
    category: 'Ibadah', tags: ['umrah'], status: 'PUBLISHED', priority: 0,
    translations: {
      id: { title: 'Panduan Indonesia', slug, excerpt: 'Ringkasan Indonesia', heroAlt: 'Alt Indonesia', body: idBody, seoTitle: 'SEO Indonesia', seoDescription: 'Deskripsi Indonesia' },
      ...(english ? { en: { title: 'English transportation', slug: `en-${slug}`, excerpt: 'English summary', heroAlt: 'English alt', body: enBody, seoTitle: 'English SEO', seoDescription: 'English description' } } : {}),
    },
  }) as ArticleInput
}
function statusCode(code: number) {
  return (error: unknown) => Boolean(error && typeof error === 'object' && 'statusCode' in error && error.statusCode === code)
}

describe('Article canonical input and locale validation', () => {
  it('defaults to ID and accepts explicit ID / EN', () => {
    assert.equal(parseLocale(undefined), 'id')
    assert.equal(parseLocale('id'), 'id')
    assert.equal(parseLocale('en'), 'en')
  })
  it('rejects unsupported, repeated, and non-string locales with 400', () => {
    for (const locale of ['fr', 'ar', ['en', 'id'], 7]) assert.throws(() => parseLocale(locale), statusCode(400))
  })
  it('accepts a canonical-only payload and strips contradictory legacy content', () => {
    const canonical = fixture()
    const normalized = articleInput.parse({ ...canonical, title: 'Wrong legacy title', slug: 'wrong-slug', body: [], seoTitle: 'Wrong SEO' })
    assert.deepEqual(normalized, canonical)
    assert.equal('title' in normalized, false)
    assert.equal('body' in normalized, false)
  })
  it('normalizes legacy payloads once, but never fills gaps inside an existing ID translation', () => {
    const canonical = fixture()
    const { translations, ...master } = canonical
    const legacy = { ...master, ...translations.id, heroImageAlt: translations.id.heroAlt }
    const parsed = articleInput.parse(legacy)
    assert.deepEqual(parsed.translations.id, canonical.translations.id)
    assert.equal(articleInput.safeParse({ ...legacy, translations: { id: { title: 'Incomplete ID' } } }).success, false)
    assert.equal(articleInput.safeParse({ ...legacy, translations: { id: null } }).success, false)
  })
  it('applies bounds and slug validation to canonical fields, not discarded duplicates', () => {
    const input = fixture()
    for (const invalid of [{ slug: 'Invalid Slug' }, { slug: null }, { title: 'x'.repeat(241) }, { body: Array(101).fill({}) }]) {
      assert.equal(articleInput.safeParse({ ...input, translations: { id: { ...input.translations.id, ...invalid } } }).success, false)
    }
    assert.equal(articleInput.safeParse({ ...input, translations: { ...input.translations, en: { slug: 'Invalid Slug' } } }).success, false)
  })
  it('allows partial English and normalizes empty slugs to null', () => {
    for (const slug of [undefined, null, '', '  ']) {
      const parsed = articleInput.parse({ ...fixture(), translations: { id: fixture().translations.id, en: { title: 'Work in progress', slug } } })
      assert.equal(parsed.translations.en?.slug, null)
      assert.deepEqual(parsed.translations.en?.body, [])
      assert.equal(isCompleteArticleTranslation(parsed.translations.en), false)
    }
  })
  it('uses the same completeness for metadata and badges, without advertising incomplete EN', () => {
    const input = fixture()
    assert.equal(isCompleteArticleTranslation(input.translations.en), true)
    assert.equal(isCompleteArticleTranslation({ ...input.translations.en, excerpt: '   ' }), false)
    assert.deepEqual(articleLocaleLinks([{ locale: 'id', ...input.translations.id }, { locale: 'en', ...input.translations.en, slug: null }]), {
      availableLocales: ['id'], localizedSlugs: { id: 'panduan-id' },
    })
  })
})

// Embedded PostgreSQL, using the repository's real SQL migrations and Drizzle
// queries. No credentials, seed, network, or production database is required.
describe('Article localization database regression', { concurrency: false }, () => {
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
  beforeEach(async () => { await db.delete(schema.articles) })
  after(async () => { await client?.close() })

  it('writes canonical ID and all legacy mirrors with identical normalized values', async () => {
    const input = articleInput.parse({ ...fixture(), title: 'Discard me', translations: { ...fixture().translations, id: { ...fixture().translations.id, title: '  Canonical title  ', seoTitle: null } } }) as ArticleInput
    const article = await createArticle(db, input)
    const idText = (await getArticleTranslations(db, article.id)).find((t) => t.locale === 'id')!
    assert.equal(article.title, 'Canonical title')
    for (const [master, translation] of [['title', 'title'], ['slug', 'slug'], ['excerpt', 'excerpt'], ['heroImageAlt', 'heroAlt'], ['body', 'body'], ['seoTitle', 'seoTitle'], ['seoDescription', 'seoDescription']] as const) {
      assert.deepEqual(article[master], idText[translation])
    }
  })
  it('permits multiple partial EN translations with null slug', async () => {
    for (const slug of ['first-id', 'second-id']) {
      const input = fixture(slug)
      input.translations.en = { ...input.translations.en!, title: 'Partial', slug: null, body: [] }
      await createArticle(db, input)
    }
    const translations = await db.select().from(schema.articleTranslations).where(eq(schema.articleTranslations.locale, 'en'))
    assert.equal(translations.length, 2)
    assert.ok(translations.every((t) => t.slug === null))
  })
  it('resolves ID and EN slugs to the same master, never another locale implicitly', async () => {
    const row = await createArticle(db, fixture())
    assert.equal((await getPublishedArticleByLocalizedSlug(db, 'panduan-id'))?.article.id, row.id)
    assert.equal((await getPublishedArticleByLocalizedSlug(db, 'en-panduan-id', 'en'))?.article.id, row.id)
    assert.equal(await getPublishedArticleByLocalizedSlug(db, 'en-panduan-id', 'id'), null)
    assert.equal(await getPublishedArticleByLocalizedSlug(db, 'panduan-id', 'en'), null)
  })
  it('excludes missing / incomplete EN and unpublished masters from listing and detail', async () => {
    await createArticle(db, fixture('missing-en', false))
    const partial = fixture('partial-id')
    partial.translations.en!.excerpt = ''
    await createArticle(db, partial)
    const draft = fixture('draft-id'); draft.status = 'DRAFT'
    await createArticle(db, draft)
    const archived = fixture('archived-id'); archived.status = 'ARCHIVED'
    await createArticle(db, archived)
    const complete = await createArticle(db, fixture('complete-id'))
    assert.deepEqual((await listLocalizedArticles(db, { locale: 'en' })).map((r) => r.id), [complete.id])
    for (const slug of ['en-partial-id', 'en-draft-id', 'en-archived-id']) assert.equal(await getPublishedArticleByLocalizedSlug(db, slug, 'en'), null)
  })
  it('preserves existing ID visibility when English is incomplete', async () => {
    const input = fixture(); input.translations.en!.body = []; input.translations.id.excerpt = ''
    await createArticle(db, input)
    assert.equal((await listLocalizedArticles(db, {})).length, 1)
    assert.ok(await getPublishedArticleByLocalizedSlug(db, 'panduan-id'))
  })
  it('rejects duplicate same-locale ID and EN slugs cleanly on create/update', async () => {
    await createArticle(db, fixture('first-id'))
    await assert.rejects(createArticle(db, fixture('first-id')), statusCode(409))
    const duplicateEN = fixture('second-id'); duplicateEN.translations.en!.slug = 'en-first-id'
    await assert.rejects(createArticle(db, duplicateEN), statusCode(409))
    const input = fixture('second-id'); input.status = 'DRAFT'
    const second = await createArticle(db, input)
    input.translations.en!.slug = 'en-first-id'
    await assert.rejects(updateArticle(db, second.id, input), statusCode(409))
    input.translations.en!.slug = 'en-second-id'; input.translations.id.slug = 'first-id'
    await assert.rejects(updateArticle(db, second.id, input), statusCode(409))
    assert.equal((await getArticle(db, second.id))?.slug, 'second-id')
  })
  it('allows identical literal slugs in different locales', async () => {
    const first = fixture('shared-slug'); first.translations.en!.slug = 'first-english'
    const one = await createArticle(db, first)
    const second = fixture('second-id'); second.translations.en!.slug = 'shared-slug'
    const two = await createArticle(db, second)
    assert.equal((await getPublishedArticleByLocalizedSlug(db, 'shared-slug', 'id'))?.article.id, one.id)
    assert.equal((await getPublishedArticleByLocalizedSlug(db, 'shared-slug', 'en'))?.article.id, two.id)
  })
  it('protects published canonical ID slugs even when a legacy payload supplies the old slug', async () => {
    const input = fixture(); const row = await createArticle(db, input)
    const conflict = articleInput.parse({ ...input, slug: input.translations.id.slug, translations: { ...input.translations, id: { ...input.translations.id, slug: 'changed-id' } } }) as ArticleInput
    await assert.rejects(updateArticle(db, row.id, conflict), statusCode(409))
  })
  it('searches the requested translation and applies EN availability/search before limit/offset', async () => {
    const missing = fixture('first-id', false); missing.priority = 100
    await createArticle(db, missing)
    const incomplete = fixture('incomplete-id'); incomplete.priority = 90; incomplete.translations.en!.body = []
    await createArticle(db, incomplete)
    const noMatch = fixture('nomatch-id'); noMatch.priority = 80; noMatch.translations.en!.title = 'Other topic'
    await createArticle(db, noMatch)
    const match1 = fixture('match-one'); match1.priority = 2
    const one = await createArticle(db, match1)
    const match2 = fixture('match-two'); match2.priority = 1
    const two = await createArticle(db, match2)
    const search = { locale: 'en' as const, search: 'transportation', limit: 1 }
    assert.deepEqual((await listLocalizedArticles(db, search)).map((r) => r.id), [one.id])
    assert.deepEqual((await listLocalizedArticles(db, { ...search, offset: 1 })).map((r) => r.id), [two.id])
    assert.equal((await listLocalizedArticles(db, { locale: 'id', search: 'transportation' })).length, 0)
    assert.equal((await listLocalizedArticles(db, { locale: 'en', search: 'Ringkasan' })).length, 0)
    assert.equal((await listLocalizedArticles(db, { locale: 'id', search: 'Ringkasan' })).length, 5)
    assert.equal((await listLocalizedArticles(db, { ...search, city: 'MADINAH' })).length, 0)
  })
  it('filters readiness globally before pagination and includes absent translations as incomplete', async () => {
    const missing = fixture('missing-id', false); missing.priority = 100
    const absent = await createArticle(db, missing)
    const partial = fixture('partial-id'); partial.priority = 90; partial.translations.en!.body = []
    const unfinished = await createArticle(db, partial)
    const one = await createArticle(db, fixture('ready-one'))
    const two = await createArticle(db, fixture('ready-two'))
    const complete = await listArticlesByTranslationReadiness(db, {}, 'complete', 1, 0)
    assert.equal(complete.total, 2)
    assert.equal(complete.rows.length, 1)
    const next = await listArticlesByTranslationReadiness(db, {}, 'complete', 1, 1)
    assert.deepEqual(new Set([complete.rows[0].id, next.rows[0].id]), new Set([one.id, two.id]))
    const incomplete = await listArticlesByTranslationReadiness(db, {}, 'incomplete', 1, 1)
    assert.equal(incomplete.total, 2)
    assert.equal(incomplete.rows[0].id, unfinished.id)
    assert.notEqual(incomplete.rows[0].id, absent.id)
    assert.equal((await listArticlesByTranslationReadiness(db, { search: 'English transportation' }, 'complete', 1, 0)).total, 2)
    assert.equal((await listArticlesByTranslationReadiness(db, { city: 'MADINAH' }, 'complete', 10, 0)).total, 0)
  })
  it('records feedback through ID and EN slugs on the same article', async () => {
    const row = await createArticle(db, fixture())
    const id = await getPublishedArticleByLocalizedSlug(db, 'panduan-id', 'id')
    const en = await getPublishedArticleByLocalizedSlug(db, 'en-panduan-id', 'en')
    await createArticleFeedback(db, id!.article.id, 'HELPFUL')
    await createArticleFeedback(db, en!.article.id, 'NOT_HELPFUL')
    assert.deepEqual(await getArticleFeedbackSummary(db, row.id), { helpful: 1, notHelpful: 1, total: 2 })
  })
  it('rolls back master + ID + EN when an EN write actually fails after earlier writes', async () => {
    const input = fixture(); input.status = 'DRAFT'
    const row = await createArticle(db, input)
    const original = await getArticleWithTranslations(db, row.id)
    await client.exec(`CREATE FUNCTION reject_test_english() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.locale = 'en' AND NEW.title = 'FAIL_EN_WRITE' THEN RAISE EXCEPTION 'injected English write failure'; END IF;
      RETURN NEW; END $$;
      CREATE TRIGGER reject_test_english BEFORE INSERT OR UPDATE ON article_translations FOR EACH ROW EXECUTE FUNCTION reject_test_english();`)
    try {
      const changed = fixture(); changed.priority = 99; changed.translations.id.title = 'Changed Indonesia'; changed.translations.id.body = []
      changed.translations.en!.title = 'FAIL_EN_WRITE'
      await assert.rejects(updateArticle(db, row.id, changed), /injected English write failure/)
      assert.deepEqual(await getArticleWithTranslations(db, row.id), original)
      const failedCreate = fixture('failed-create'); failedCreate.translations.en!.title = 'FAIL_EN_WRITE'
      await assert.rejects(createArticle(db, failedCreate), /injected English write failure/)
      assert.equal((await db.select().from(schema.articles)).length, 1)
    } finally { await client.exec('DROP TRIGGER reject_test_english ON article_translations; DROP FUNCTION reject_test_english();') }
  })
  it('maps a database uniqueness failure after precheck to 409 and rolls back the request', async () => {
    await createArticle(db, fixture('taken-id'))
    await client.exec(`CREATE FUNCTION force_test_slug_collision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.locale = 'en' AND NEW.title = 'COLLISION' THEN NEW.slug := 'en-taken-id'; END IF;
      RETURN NEW; END $$;
      CREATE TRIGGER force_test_slug_collision BEFORE INSERT ON article_translations FOR EACH ROW EXECUTE FUNCTION force_test_slug_collision();`)
    try {
      const input = fixture('other-id'); input.translations.en!.title = 'COLLISION'
      await assert.rejects(createArticle(db, input), (error: unknown) => statusCode(409)(error) && !String(error).includes('article_translations_locale_slug_unique'))
      assert.equal((await db.select().from(schema.articles)).length, 1)
    } finally { await client.exec('DROP TRIGGER force_test_slug_collision ON article_translations; DROP FUNCTION force_test_slug_collision();') }
  })
  it('preserves structured bodies, SEO, and null clears through save/reload', async () => {
    const input = fixture(); const row = await createArticle(db, input)
    input.translations.id.seoTitle = null; input.translations.id.seoDescription = null
    input.translations.en!.body = [...enBody, { type: 'paragraph', text: 'Added English' }]
    await updateArticle(db, row.id, input)
    const loaded = await getArticleWithTranslations(db, row.id)
    const serialized = adminArticleWithTranslations(loaded!.article, loaded!.translations)
    assert.deepEqual(serialized.translations.id.body, idBody)
    assert.deepEqual(serialized.translations.en.body, input.translations.en!.body)
    assert.equal(serialized.seoTitle, null)
    assert.equal(serialized.translations.id.seoTitle, null)
    assert.equal(serialized.translations.en.seoTitle, 'English SEO')
    assert.equal(serialized.translations.en.complete, true)
  })
  it('canonical admin reads override stale legacy content, including body and cleared SEO', async () => {
    const row = await createArticle(db, fixture())
    await db.update(schema.articles).set({ title: 'Stale title', body: [], seoTitle: 'Stale SEO' }).where(eq(schema.articles.id, row.id))
    const loaded = await getArticleWithTranslations(db, row.id)
    const serialized = adminArticleWithTranslations(loaded!.article, loaded!.translations)
    assert.equal(serialized.title, 'Panduan Indonesia')
    assert.deepEqual(serialized.body, idBody)
    assert.equal(serialized.seoTitle, 'SEO Indonesia')
  })
})
