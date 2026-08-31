import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { eq } from 'drizzle-orm'
import * as schema from '../server/db/schema'
import type { DbLike } from '../server/db'
import * as guides from '../server/services/guides'
import * as gallery from '../server/services/gallery'
import * as locations from '../server/services/map-locations'
import * as home from '../server/services/page-settings'
import { createArticle } from '../server/services/articles'
import { guideInput, galleryInput, locationInput, homePageSettingsInput, pageSettingsInput, articleInput } from '../server/utils/validators'
import { adminGuide, adminGallery, adminMapLocation } from '../server/utils/serializers'
import { parseLocale } from '../server/utils/locales'
import { parseReadiness } from '../server/utils/media-localization'
import { isCompleteHomeTranslation } from '../shared/media-localization'

const body = (text: string) => [{ type: 'heading', level: 2, text }, { type: 'paragraph', text }, { type: 'list', ordered: true, items: ['One', 'Two'] }, { type: 'image', src: 'https://example.com/body.jpg', alt: text }]
function guideFixture(slug = 'panduan-id'): any {
  return guideInput.parse({ group: 'IBADAH', sortOrder: 10, status: 'PUBLISHED', translations: {
    id: { title: 'Judul Indonesia', slug, summary: 'Ringkasan Indonesia', body: body('Isi Indonesia') },
    en: { title: 'English transport', slug: `en-${slug}`, summary: 'English summary', body: body('English content') },
  } })
}
function galleryFixture(): any {
  return galleryInput.parse({ imageUrl: 'https://example.com/shared.jpg', imageFileId: 'same-file', city: 'MAKKAH', category: 'MASJID', latitude: 21.42, longitude: 39.82, tags: ['shared'], priority: 0, status: 'PUBLISHED', translations: {
    id: { title: 'Judul Indonesia', altText: 'Foto Indonesia', description: 'Deskripsi Indonesia', locationName: 'Lokasi Indonesia' },
    en: { title: 'English transport', altText: 'English photo', description: 'English description', locationName: 'English location' },
  } })
}
function locationFixture(): any {
  return locationInput.parse({ city: 'MAKKAH', category: 'HARAM', latitude: 21.42, longitude: 39.82, imageUrl: 'https://example.com/shared.jpg', imageFileId: 'same-file', googleMapsUrl: 'https://maps.google.com/?q=21.42,39.82', tags: ['shared'], sortOrder: 10, isActive: true, translations: {
    id: { name: 'Nama Indonesia', shortDescription: 'Deskripsi Indonesia', altText: 'Alt Indonesia' },
    en: { name: 'English transport', shortDescription: 'English description', altText: 'English alt' },
  } })
}
function homeFixture(): any {
  return homePageSettingsInput.parse({ heroImageUrl: 'https://example.com/shared.jpg', heroImageFileId: 'same-file', featuredArticleId: null, supportingArticleIds: [], editorialArticleIds: [],
    heroTopicOverride: [{ id: 'transport', isActive: true, sortOrder: 0 }, { id: 'food', isActive: true, sortOrder: 10 }], translations: {
      id: { heroHeadline: 'Headline Indonesia', heroSubheadline: 'Subheadline Indonesia', heroTopicLabels: { transport: 'Transportasi', food: 'Kuliner' } },
      en: { heroHeadline: 'English headline', heroSubheadline: 'English subheadline', heroTopicLabels: { transport: 'Transportation', food: 'Food' } },
    },
  })
}
const cases = [
  { name: 'Guides', table: schema.guides, translation: schema.guideTranslations, sqlTable: 'guide_translations', field: 'title', sqlField: 'title', fixture: guideFixture, input: guideInput, create: guides.createGuide, update: guides.updateGuide, get: guides.getGuide, texts: guides.getGuideTranslations, serialize: adminGuide, list: guides.listGuides, count: guides.countGuides, publicList: guides.listLocalizedGuides, detail: (db: any, row: any, locale: any) => guides.getPublishedGuideBySlug(db, locale === 'en' ? `en-${row.slug}` : row.slug, locale), incomplete: { body: [] }, hidden: { status: 'DRAFT' }, order: (n: number) => ({ sortOrder: n }) },
  { name: 'Gallery', table: schema.galleryItems, translation: schema.galleryTranslations, sqlTable: 'gallery_translations', field: 'altText', sqlField: 'alt_text', fixture: galleryFixture, input: galleryInput, create: gallery.createGallery, update: gallery.updateGallery, get: gallery.getGallery, texts: gallery.getGalleryTranslations, serialize: adminGallery, list: gallery.listGallery, count: gallery.countGallery, publicList: gallery.listLocalizedGallery, detail: (db: any, row: any, locale: any) => gallery.getPublishedGallery(db, row.id, locale), incomplete: { altText: '' }, hidden: { status: 'ARCHIVED' }, order: (n: number) => ({ priority: -n }) },
  { name: 'Locations', table: schema.mapLocations, translation: schema.mapLocationTranslations, sqlTable: 'map_location_translations', field: 'name', sqlField: 'name', fixture: locationFixture, input: locationInput, create: locations.createLocation, update: locations.updateLocation, get: locations.getLocation, texts: locations.getLocationTranslations, serialize: adminMapLocation, list: locations.listLocations, count: locations.countLocations, publicList: locations.listLocalizedLocations, detail: (db: any, row: any, locale: any) => locations.getActiveLocation(db, row.id, locale), incomplete: { shortDescription: '' }, hidden: { isActive: false }, order: (n: number) => ({ sortOrder: n }) },
]

describe('Media canonical payload validation', () => {
  it('validates default / explicit locales and readiness consistently', () => {
    assert.equal(parseLocale(undefined), 'id'); assert.equal(parseLocale('id'), 'id'); assert.equal(parseLocale('en'), 'en')
    for (const value of ['ar', ['id', 'en'], 1]) assert.throws(() => parseLocale(value), { statusCode: 400 })
    assert.equal(parseReadiness('complete'), 'complete'); assert.equal(parseReadiness('incomplete'), 'incomplete')
    assert.throws(() => parseReadiness('invalid'), { statusCode: 400 })
  })
  for (const c of cases) it(`${c.name}: normalizes legacy only once and ignores conflicting duplicates`, () => {
    const input = c.fixture()
    assert.deepEqual(c.input.parse({ ...input, [c.field]: 'Wrong legacy duplicate' }), input)
    const { translations, ...master } = input
    assert.deepEqual(c.input.parse({ ...master, ...translations.id }).translations.id, translations.id)
    assert.equal(c.input.safeParse({ ...master, ...translations.id, translations: { id: null } }).success, false)
    assert.ok(c.input.safeParse({ ...input, translations: { id: translations.id, en: {} } }).success)
  })
  it('Home labels stay canonical and topics require stable unique IDs and ID labels', () => {
    const input = homeFixture()
    const parsed = homePageSettingsInput.parse({ ...input, heroHeadline: 'Wrong headline', heroTopicOverride: input.heroTopicOverride.map((t: any) => ({ ...t, label: 'Wrong label' })) })
    assert.deepEqual(parsed, input)
    assert.equal(homePageSettingsInput.safeParse({ ...input, heroTopicOverride: [...input.heroTopicOverride, input.heroTopicOverride[0]] }).success, false)
    assert.equal(homePageSettingsInput.safeParse({ ...input, translations: { id: { ...input.translations.id, heroTopicLabels: {} } } }).success, false)
    assert.ok(homePageSettingsInput.safeParse({ ...input, translations: { id: input.translations.id, en: {} } }).success)
    assert.equal(homePageSettingsInput.safeParse({ ...input, heroTopicOverride: [{ id: 'constructor', isActive: true, sortOrder: 0 }] }).success, false)
  })
})

describe('Media localization database regression', { concurrency: false }, () => {
  let client: PGlite
  let db: DbLike
  before(async () => {
    client = await PGlite.create()
    db = drizzle(client, { schema }) as unknown as DbLike
    const journal = JSON.parse(await readFile(new URL('../server/db/migrations/meta/_journal.json', import.meta.url), 'utf8'))
    for (const entry of journal.entries) {
      if (entry.tag === '0016_media_localization') {
        for (const c of cases) {
          const { translations, ...master } = c.fixture()
          await db.insert(c.table as any).values({ ...master, ...translations.id, latitude: '21.42', longitude: '39.82' })
        }
        await db.insert(schema.mediaPageSettings).values({ pageKey: 'home', heroHeadline: 'Backfill Home', heroTopicOverride: [{ id: 'one', label: 'Label Indonesia', isActive: true, sortOrder: 0 }], supportingArticleIds: [], editorialArticleIds: [] })
        await db.insert(schema.mediaPageSettings).values({ pageKey: 'makkah', heroHeadline: 'City unchanged', supportingArticleIds: [], editorialArticleIds: [] })
      }
      await client.exec(await readFile(new URL(`../server/db/migrations/${entry.tag}.sql`, import.meta.url), 'utf8'))
    }
    // Assert the real migration copies all old content, creates no English text, and leaves city settings alone.
    for (const c of cases) {
      const texts: any[] = await db.select().from(c.translation as any)
      assert.equal(texts.length, 1); assert.equal(texts[0].locale, 'id')
      for (const [field, value] of Object.entries(c.fixture().translations.id)) assert.deepEqual(texts[0][field], value)
    }
    const homeTexts = await db.select().from(schema.mediaPageSettingsTranslations)
    assert.equal(homeTexts.length, 1); assert.equal(homeTexts[0].heroHeadline, 'Backfill Home')
    assert.deepEqual(homeTexts[0].heroTopicLabels, { one: 'Label Indonesia' })
  })
  beforeEach(async () => {
    await db.delete(schema.mediaPageSettings); await db.delete(schema.articles)
    for (const c of cases) await db.delete(c.table as any)
  })
  after(async () => { await client?.close() })

  for (const c of cases) describe(c.name, () => {
    const create: any = c.create, update: any = c.update, serialize: any = c.serialize
    it('mirrors canonical ID, preserves both languages on reload, and clears nullable text', async () => {
      const input = c.fixture(); const row = await create(db, input)
      for (const [field, value] of Object.entries(input.translations.id)) assert.deepEqual(row[field], value)
      const texts = await c.texts(db, row.id)
      const admin = serialize({ ...row, [c.field]: 'Stale legacy value' }, texts)
      assert.equal(admin[c.field], input.translations.id[c.field])
      for (const locale of ['id', 'en']) for (const [field, value] of Object.entries(input.translations[locale])) assert.deepEqual(admin.translations[locale][field], value)
      if (c.name !== 'Guides') {
        assert.equal(row.imageFileId, 'same-file'); assert.equal(Number(row.latitude), 21.42)
        assert.equal((await c.detail(db, row, 'en'))!.id, row.id)
      }
      const optional = c.name === 'Guides' ? 'summary' : c.name === 'Gallery' ? 'description' : 'altText'
      input.translations.id[optional] = null; input.translations.en[optional] = null
      await update(db, row.id, input)
      assert.equal((await c.get(db, row.id) as any)[optional], null)
      assert.equal((await c.detail(db, row, 'en') as any)[optional], null)
      delete input.translations.en
      await update(db, row.id, input)
      assert.equal((await c.texts(db, row.id)).length, 2)
    })
    it('filters EN completeness and public state before pagination, with locale-specific search', async () => {
      const missing = c.fixture('missing'); delete missing.translations.en; Object.assign(missing, c.order(0)); const absent = await create(db, missing)
      const partial = c.fixture('partial'); Object.assign(partial.translations.en, c.incomplete); Object.assign(partial, c.order(1)); const unfinished = await create(db, partial)
      const first = c.fixture('first'); Object.assign(first, c.order(2)); const one = await create(db, first)
      const second = c.fixture('second'); Object.assign(second, c.order(3)); const two = await create(db, second)
      const hidden = c.fixture('hidden'); Object.assign(hidden, c.hidden, c.order(4)); const unavailable = await create(db, hidden)
      const q = { locale: 'en' as const, search: 'transport', limit: 1 }
      assert.deepEqual((await c.publicList(db, q)).map(r => r.id), [one.id])
      assert.deepEqual((await c.publicList(db, { ...q, offset: 1 })).map(r => r.id), [two.id])
      assert.equal((await c.publicList(db, { locale: 'en', search: 'Indonesia' })).length, 0)
      assert.equal((await c.publicList(db, { locale: 'id', search: 'transport' })).length, 0)
      assert.equal((await c.publicList(db, { search: 'Indonesia' })).length, 4)
      for (const row of [absent, unfinished, unavailable]) assert.equal(await c.detail(db, row, 'en'), null)
      assert.ok(await c.detail(db, unfinished, 'id'))
      assert.equal(await c.count(db, { translation: 'complete' }), 3)
      assert.equal(await c.count(db, { translation: 'incomplete' }), 2)
      assert.deepEqual((await c.list(db, { translation: 'complete', limit: 1, offset: 1 })).map(r => r.id), [two.id])
      assert.deepEqual((await c.list(db, { translation: 'incomplete', limit: 1, offset: 1 })).map(r => r.id), [unfinished.id])
    })
    it('rolls back master, ID and English after an actual English database write failure', async () => {
      const input = c.fixture(); const row = await create(db, input)
      const before = await c.get(db, row.id); const texts = await c.texts(db, row.id)
      await client.exec(`CREATE FUNCTION reject_media_english() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF NEW.locale = 'en' AND NEW.${c.sqlField} = 'FAIL_EN_WRITE' THEN RAISE EXCEPTION 'injected media English failure'; END IF; RETURN NEW; END $$;
        CREATE TRIGGER reject_media_english BEFORE INSERT OR UPDATE ON ${c.sqlTable} FOR EACH ROW EXECUTE FUNCTION reject_media_english();`)
      try {
        input.translations.id[c.field] = 'Changed Indonesia'; input.translations.en[c.field] = 'FAIL_EN_WRITE'; Object.assign(input, c.order(99))
        await assert.rejects(update(db, row.id, input), /injected media English failure/)
        assert.deepEqual(await c.get(db, row.id), before); assert.deepEqual(await c.texts(db, row.id), texts)
        if (c.name === 'Guides') { input.translations.id.slug = 'new-id'; input.translations.en.slug = 'new-en' }
        await assert.rejects(create(db, input), /injected media English failure/)
        assert.equal(await c.count(db, {}), 1)
      } finally { await client.exec(`DROP TRIGGER reject_media_english ON ${c.sqlTable}; DROP FUNCTION reject_media_english();`) }
    })
    it('cascades translations on master deletion', async () => {
      const row = await create(db, c.fixture())
      await db.delete(c.table as any).where(eq(c.table.id, row.id))
      assert.deepEqual(await c.texts(db, row.id), [])
    })
  })

  it('Guides: null English slugs coexist, localized slugs resolve, duplicate locale slugs return clean 409', async () => {
    for (const slug of ['one', 'two']) { const input = guideFixture(slug); input.translations.en.slug = null; await guides.createGuide(db, input) }
    const first = await guides.createGuide(db, guideFixture('shared'))
    const other = guideFixture('other'); other.translations.en.slug = 'shared'; const second = await guides.createGuide(db, other)
    assert.equal((await guides.getPublishedGuideBySlug(db, 'shared'))?.id, first.id)
    assert.equal((await guides.getPublishedGuideBySlug(db, 'shared', 'en'))?.id, second.id)
    await assert.rejects(guides.createGuide(db, guideFixture('shared')), { statusCode: 409 })
    const input = guideFixture('third'); input.translations.en.slug = 'en-shared'
    await assert.rejects(guides.createGuide(db, input), { statusCode: 409 })
    await assert.rejects(guides.updateGuide(db, second.id, input), { statusCode: 409 })
    assert.equal((await guides.getGuide(db, second.id))?.slug, 'other')
  })
  it('Guides: maps a post-precheck uniqueness race to 409 and rolls back', async () => {
    await guides.createGuide(db, guideFixture('taken'))
    await client.exec(`CREATE FUNCTION media_slug_collision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.locale = 'en' THEN NEW.slug := 'en-taken'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER media_slug_collision BEFORE INSERT ON guide_translations FOR EACH ROW EXECUTE FUNCTION media_slug_collision();`)
    try {
      await assert.rejects(guides.createGuide(db, guideFixture('fresh')), (e: any) => e.statusCode === 409 && !String(e).includes('locale_slug_unique'))
      assert.equal(await guides.countGuides(db, {}), 1)
    } finally { await client.exec('DROP TRIGGER media_slug_collision ON guide_translations; DROP FUNCTION media_slug_collision();') }
  })
  it('Home: canonical labels follow stable topic IDs across reorder and English readiness', async () => {
    const input = homeFixture(); await home.saveHomePageSettings(db, input)
    assert.equal((await home.getPageSettings(db, 'home'))?.heroHeadline, input.translations.id.heroHeadline)
    input.heroTopicOverride.reverse(); input.heroTopicOverride.forEach((t: any, i: number) => t.sortOrder = i * 10)
    await home.saveHomePageSettings(db, input)
    const en = await home.publicPageSettings(db, 'home', 'en')
    assert.deepEqual(en.heroTopicOverride?.map(t => t.label), ['Food', 'Transportation'])
    assert.deepEqual(en.availableLocales, ['id', 'en']); assert.equal(en.heroHeadline, 'English headline')
    delete input.translations.en.heroTopicLabels.food
    await home.saveHomePageSettings(db, input)
    const partial = await home.publicPageSettings(db, 'home', 'en')
    assert.equal(partial.translationAvailable, false); assert.equal(partial.heroHeadline, null); assert.equal(partial.heroTopicOverride, null)
    assert.equal(partial.heroImageUrl, input.heroImageUrl); assert.deepEqual(partial.availableLocales, ['id'])
    assert.equal((await home.publicPageSettings(db, 'home')).heroHeadline, 'Headline Indonesia')
    input.heroTopicOverride.find((t: any) => t.id === 'food').isActive = false
    assert.ok(isCompleteHomeTranslation(input.translations.en, input.heroTopicOverride))
  })
  it('Home: explicit null defaults never revive old legacy copy; no EN fallback', async () => {
    const input = homeFixture(); input.heroTopicOverride = null; input.translations.id.heroHeadline = null; input.translations.id.heroSubheadline = null; delete input.translations.en
    await home.saveHomePageSettings(db, input)
    await db.update(schema.mediaPageSettings).set({ heroHeadline: 'Stale headline' })
    assert.equal((await home.getHomeSettings(db))?.heroHeadline, null)
    assert.equal((await home.publicPageSettings(db, 'home')).heroHeadline, null)
    assert.equal((await home.publicPageSettings(db, 'home', 'en')).heroHeadline, null)
    assert.equal((await home.publicPageSettings(db, 'home', 'en')).heroTopicOverride, null)
  })
  it('Home: English article slots retain IDs but exclude unavailable English and unpublished articles', async () => {
    async function article(slug: string, en: boolean) {
      const id = { title: 'Artikel Indonesia', slug, excerpt: 'Ringkasan', heroAlt: 'Alt', body: body('Isi') }
      return createArticle(db, articleInput.parse({ city: 'MAKKAH', contentType: 'article', category: 'Ibadah', tags: [], status: 'PUBLISHED', heroImage: 'https://example.com/hero.jpg', priority: 0, translations: { id, ...(en ? { en: { ...id, title: 'English article', slug: `en-${slug}` } } : {}) } }) as any)
    }
    const one = await article('one', true); const two = await article('two', false); const unpublished = await article('old', true)
    const input = homeFixture(); input.featuredArticleId = one.id; input.supportingArticleIds = [two.id, unpublished.id]
    await home.saveHomePageSettings(db, input)
    await db.update(schema.articles).set({ status: 'ARCHIVED' }).where(eq(schema.articles.id, unpublished.id))
    const en = await home.publicPageSettings(db, 'home', 'en'); const id = await home.publicPageSettings(db, 'home')
    assert.equal(en.featuredArticleId, one.id); assert.deepEqual(en.supportingArticleIds, []); assert.deepEqual(id.supportingArticleIds, [two.id])
    input.supportingArticleIds = [one.id]
    await assert.rejects(home.saveHomePageSettings(db, input), /duplikat/)
  })
  it('Home: rolls back shared settings and ID when English fails', async () => {
    const input = homeFixture(); await home.saveHomePageSettings(db, input)
    const original = await home.getHomeSettings(db)
    await client.exec(`CREATE FUNCTION reject_home_english() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.locale = 'en' THEN RAISE EXCEPTION 'injected Home failure'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER reject_home_english BEFORE INSERT OR UPDATE ON media_page_settings_translations FOR EACH ROW EXECUTE FUNCTION reject_home_english();`)
    try {
      input.heroImageUrl = 'https://example.com/changed.jpg'; input.translations.id.heroHeadline = 'Changed Indonesia'; input.heroTopicOverride.reverse()
      await assert.rejects(home.saveHomePageSettings(db, input), /injected Home failure/)
      assert.deepEqual(await home.getHomeSettings(db), original)
    } finally { await client.exec('DROP TRIGGER reject_home_english ON media_page_settings_translations; DROP FUNCTION reject_home_english();') }
  })
  it('Makkah/Madinah keep their existing Indonesian contract and no Home translations are created', async () => {
    for (const pageKey of ['makkah', 'madinah']) {
      const input = pageSettingsInput.parse({ heroHeadline: 'Kota Indonesia', supportingArticleIds: [], editorialArticleIds: [], heroTopicOverride: [{ id: 'city', label: 'Topik Kota', isActive: true, sortOrder: 0 }] })
      await home.savePageSettings(db, pageKey, input)
      const published = await home.publicPageSettings(db, pageKey)
      assert.equal(published.heroHeadline, 'Kota Indonesia'); assert.equal(published.heroTopicOverride?.[0].label, 'Topik Kota')
    }
    assert.deepEqual(await db.select().from(schema.mediaPageSettingsTranslations), [])
  })
})
