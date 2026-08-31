import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { parse, compileScript } from 'vue/compiler-sfc'
import { createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

const blocks = (text: string) => [{ type: 'paragraph', text }]
const common = { id: 1, city: 'MAKKAH', category: 'MASJID', tags: ['shared'], latitude: 21.42, longitude: 39.82, status: 'PUBLISHED', publishedAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-02T00:00:00.000Z', imageUrl: 'https://example.com/shared.jpg', imageFileId: 'shared-file', isActive: true, priority: 0, sortOrder: 10 }
const rows: Record<string, any> = {
  guides: { ...common, group: 'IBADAH', title: 'Stale guide', slug: 'stale', summary: 'Stale summary', body: blocks('Stale body'), translations: {
    id: { title: 'Judul Indonesia', slug: 'judul-id', summary: 'Ringkasan Indonesia', body: blocks('Isi khusus Indonesia') },
    en: { title: 'English title', slug: 'english-title', summary: 'English summary', body: blocks('English body') },
  } },
  gallery: { ...common, title: 'Stale title', altText: 'Stale alt', description: 'Stale description', locationName: 'Stale location', takenAt: null, translations: {
    id: { title: 'Judul Indonesia', altText: 'Alt Indonesia', description: null, locationName: 'Lokasi Indonesia' },
    en: { title: 'English title', altText: 'English alt', description: 'English description', locationName: 'English location' },
  } },
  locations: { ...common, category: 'HARAM', name: 'Stale name', shortDescription: 'Stale description', altText: 'Stale alt', googleMapsUrl: 'https://maps.google.com/', translations: {
    id: { name: 'Nama Indonesia', shortDescription: 'Deskripsi Indonesia', altText: null },
    en: { name: 'English name', shortDescription: 'English description', altText: 'English alt' },
  } },
}
const home = { heroHeadline: 'Stale headline', heroSubheadline: 'Stale subheadline', heroImageUrl: 'https://example.com/shared.jpg', heroImageFileId: 'shared-file', featuredArticleId: 5, supportingArticleIds: [6], editorialArticleIds: [], heroTopicOverride: [{ id: 'one', label: 'Stale label', isActive: true, sortOrder: 0 }], translations: {
  id: { heroHeadline: 'Headline Indonesia', heroSubheadline: 'Subheadline Indonesia', heroTopicLabels: { one: 'Label Indonesia' } },
  en: { heroHeadline: 'English headline', heroSubheadline: 'English subheadline', heroTopicLabels: { one: 'English label' } },
} }

describe('Media editors render their actual Vue templates', () => {
  let directory: string
  const pages: Record<string, any> = {}, components: Record<string, any> = {}
  before(async () => {
    directory = await mkdtemp(resolve('node_modules/.media-editor-test-'))
    async function compile(path: string, expose = '') {
      const source = await readFile(resolve(path), 'utf8')
      const instrumented = source.replace('<script setup lang="ts">', '<script setup lang="ts">\nimport { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue";').replace('</script>', `\n${expose}\n</script>`)
      const { descriptor, errors } = parse(instrumented, { filename: path }); assert.deepEqual(errors, [])
      const script = compileScript(descriptor, { id: path, inlineTemplate: true })
      const output = await build({ stdin: { contents: script.content, loader: 'ts', resolveDir: process.cwd() }, bundle: true, format: 'esm', platform: 'node', packages: 'external', write: false, alias: { '~': process.cwd() } })
      const file = join(directory, path.replaceAll('/', '-').replace('.vue', '.mjs')); await writeFile(file, output.outputFiles[0].text)
      return (await import(pathToFileURL(file).href)).default
    }
    const stubs = `function definePageMeta() {} function useAdminToast() { return { show() {} } }
      function useBulkSelection() { return { selected: ref([]), selectPage() {}, toggle() {}, clear() {}, isSelected() { return false } } }
      const window = { scrollTo() {} };`
    pages.guides = await compile('pages/media/guides.vue', `${stubs} defineExpose({ form, english, edit: editGuide, reset: emptyForm, payload, localeTab, previewLocale, previewOpen, items: guides, pending });`)
    pages.gallery = await compile('pages/media/gallery.vue', `${stubs} defineExpose({ form, english, edit, reset, payload: body, localeTab, previewOpen, items, pending });`)
    pages.locations = await compile('pages/media/locations.vue', `${stubs} defineExpose({ form, english, edit, reset, payload, localeTab, previewOpen, items, pending });`)
    pages.home = await compile('components/HomePageSettingsEditor.vue', `${stubs} defineExpose({ hero, english, applySettings, payload, localeTab, preview, pending, heroTopics, editTopic, articles, previewItem });`)
    for (const name of ['AdminStatusBadge', 'MediaStructuredBlockEditor', 'MediaLocaleTabs', 'MediaTranslationBadges', 'MediaTranslationFilter']) components[name] = await compile(`components/${name}.vue`)
  })
  after(async () => { if (directory) await rm(directory, { force: true, recursive: true }) })
  async function render(name: string, arrange: (state: any) => void) {
    const page = pages[name]
    const app = createSSRApp({ ...page, setup(props: any, context: any) {
      let state: any; const renderer = page.setup(props, { ...context, expose(value: any) { state = value } })
      state.pending.value = false; arrange(state); return renderer
    } })
    const Stub = defineComponent({ setup: (_, { slots }) => () => h('div', [slots.default?.(), slots.actions?.()]) })
    for (const component of ['PageHead', 'BulkActionBar', 'MediaImageUploader', 'AdminConfirmDialog']) app.component(component, Stub)
    for (const [component, value] of Object.entries(components)) app.component(component, value)
    return renderToString(app)
  }
  for (const name of Object.keys(rows)) {
    it(`${name}: canonical reload and canonical-only save preserve shared publication and assets`, async () => {
      await render(name, s => {
        s.edit(rows[name]); const payload = s.payload(s.form.status)
        for (const key of Object.keys(rows[name].translations.id)) {
          assert.equal(key in payload, false)
          assert.deepEqual(payload.translations.id[key], rows[name].translations.id[key])
          assert.deepEqual(payload.translations.en[key], rows[name].translations.en[key])
        }
        if (name !== 'locations') { assert.equal(payload.status, 'PUBLISHED'); assert.equal(payload.publishedAt, common.publishedAt) }
        if (name !== 'guides') { assert.equal(payload.imageFileId, 'shared-file'); assert.equal(payload.latitude, 21.42) }
        if (name === 'guides') { s.form.body[0].text = 'Edited'; assert.equal(rows[name].translations.id.body[0].text, 'Isi khusus Indonesia') }
        s.reset(); assert.equal(s.localeTab.value, 'id'); assert.equal(s.english.title ?? s.english.name, '')
      })
    })
    it(`${name}: English preview renders English content without ID fallback`, async () => {
      const html = await render(name, s => { s.edit(rows[name]); s.localeTab.value = 'en'; if (s.previewLocale) s.previewLocale.value = 'en'; s.previewOpen.value = true })
      const preview = html.split(`aria-label="Preview ${name === 'guides' ? 'panduan' : name}"`)[1]
      assert.ok(preview); assert.match(preview, /English/); assert.doesNotMatch(preview, /Stale|Isi khusus Indonesia|Judul Indonesia|Alt Indonesia|Nama Indonesia|Deskripsi Indonesia/)
      if (name === 'guides') assert.match(preview, /English body/)
      else assert.match(preview, /alt="English alt"/)
      const empty = await render(name, s => { s.edit({ ...rows[name], translations: { id: rows[name].translations.id } }); s.localeTab.value = 'en'; if (s.previewLocale) s.previewLocale.value = 'en'; s.previewOpen.value = true })
      assert.doesNotMatch(empty.split(`aria-label="Preview ${name === 'guides' ? 'panduan' : name}"`)[1], /Stale|Isi khusus Indonesia|Judul Indonesia|Alt Indonesia|Nama Indonesia|Deskripsi Indonesia/)
      assert.match(html, /Simpan/)
    })
    it(`${name}: renders badges and exactly one global English readiness filter`, async () => {
      const html = await render(name, s => { s.items.value = [rows[name], { ...rows[name], id: 2, translations: { id: rows[name].translations.id } }] })
      for (const badge of ['ID ✓', 'EN ✓', 'EN —']) assert.ok(html.includes(badge))
      assert.equal((html.match(/Belum Lengkap/g) || []).length, 1)
    })
  }
  it('Guide editor state remains ID while a separate English preview is shown', async () => {
    const html = await render('guides', s => { s.edit(rows.guides); s.localeTab.value = 'id'; s.previewLocale.value = 'en'; s.previewOpen.value = true })
    const [editor, preview] = html.split('aria-label="Preview panduan"')
    assert.match(editor, /Isi khusus Indonesia/); assert.doesNotMatch(editor, /English body/); assert.match(preview, /English body/); assert.doesNotMatch(preview, /Isi khusus Indonesia/)
  })
  it('Home reads canonical labels and saves translations against shared topic IDs', async () => {
    await render('home', s => {
      s.applySettings(home); assert.equal(s.hero.headline, 'Headline Indonesia'); assert.equal(s.heroTopics.value[0].label, 'Label Indonesia')
      s.localeTab.value = 'en'; s.editTopic(0, 'Changed English label')
      const payload = s.payload(); assert.equal('heroHeadline' in payload, false); assert.equal('label' in payload.heroTopicOverride[0], false)
      assert.equal(payload.translations.id.heroTopicLabels.one, 'Label Indonesia'); assert.equal(payload.translations.en.heroTopicLabels.one, 'Changed English label')
      assert.equal(payload.heroImageFileId, 'shared-file'); assert.equal(payload.featuredArticleId, 5)
      s.applySettings({ ...home, translations: { id: { ...home.translations.id, heroHeadline: null } } }); assert.equal(s.hero.headline, ''); assert.equal(s.english.headline, '')
    })
  })
  it('Home English preview never falls back to ID labels or untranslated articles', async () => {
    const html = await render('home', s => {
      s.applySettings(home); s.localeTab.value = 'en'; s.preview.value = true
      s.articles.value = [{ id: 5, title: 'Artikel Indonesia', translations: { en: { title: 'English article', complete: true } } }, { id: 6, title: 'Untranslated Indonesia' }]
    })
    const preview = html.split('aria-label="Preview Home"')[1]
    assert.match(preview, /English headline/); assert.match(preview, /English label/); assert.match(preview, /English article/)
    assert.doesNotMatch(preview, /Headline Indonesia|Label Indonesia|Artikel Indonesia|Untranslated Indonesia|Stale/)
    const empty = await render('home', s => { s.applySettings({ ...home, translations: { id: home.translations.id }, heroTopicOverride: null }); s.localeTab.value = 'en'; s.preview.value = true })
    assert.doesNotMatch(empty.split('aria-label="Preview Home"')[1], /Headline Indonesia|Rekomendasi Kuliner|Stale/)
  })
})
