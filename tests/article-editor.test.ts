import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { parse, compileScript } from 'vue/compiler-sfc'
import { createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { articleEditorTranslation } from '../shared/article-localization'

const original = {
  id: 1, title: 'Stale legacy title', slug: 'stale-slug', excerpt: 'Stale excerpt',
  heroImage: '/hero.jpg', heroImageAlt: 'Stale alt', body: [{ type: 'paragraph' as const, text: 'Stale body' }],
  city: 'MAKKAH', contentType: 'article', category: 'Ibadah', tags: [], status: 'PUBLISHED', priority: 0,
  publishedAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z',
  seoTitle: 'Stale SEO', seoDescription: 'Stale description', ogImage: '/og.jpg',
  translations: {
    id: { title: 'Judul Indonesia', slug: 'judul-indonesia', excerpt: 'Ringkasan Indonesia', heroAlt: 'Alt Indonesia',
      body: [{ type: 'paragraph' as const, text: 'Body khusus Indonesia' }], seoTitle: null, seoDescription: 'SEO deskripsi ID', complete: true },
    en: { title: 'English title', slug: 'english-title', excerpt: 'English excerpt', heroAlt: 'English alt',
      body: [{ type: 'paragraph' as const, text: 'English preview body' }], seoTitle: 'English SEO', seoDescription: 'English description', complete: true },
  },
}

// Compile and render the real SFC with Vue, using the existing node:test runner.
// Only Nuxt runtime services are stubbed. No duplicate editor/preview template.
describe('Article editor and preview regression', () => {
  let directory: string
  let Page: any
  let Badge: any
  let Blocks: any
  const autoImports = `import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';\n`
  before(async () => {
    directory = await mkdtemp(resolve('node_modules/.article-editor-test-'))
    async function compile(path: string, expose = '') {
      const source = await readFile(resolve(path), 'utf8')
      const instrumented = source.replace('<script setup lang="ts">', '<script setup lang="ts">\n' + autoImports).replace('</script>', '\n' + expose + '\n</script>')
      const { descriptor, errors } = parse(instrumented, { filename: path })
      assert.deepEqual(errors, [])
      const script = compileScript(descriptor, { id: path, inlineTemplate: true })
      const output = await build({ stdin: { contents: script.content, loader: 'ts', resolveDir: process.cwd() },
        bundle: true, format: 'esm', platform: 'node', packages: 'external', write: false, alias: { '~': process.cwd() } })
      const file = join(directory, path.replaceAll('/', '-').replace('.vue', '.mjs'))
      await writeFile(file, output.outputFiles[0].text)
      return (await import(pathToFileURL(file).href)).default
    }
    Page = await compile('pages/media/articles.vue', `
      function definePageMeta() {}
      function useAdminToast() { return { show() {} } }
      function useBulkSelection() { return { selected: ref([]), selectPage() {}, toggle() {}, clear() {}, isSelected() { return false } } }
      const window = { scrollTo() {} };
      defineExpose({ form, enTranslation, articles, editArticle, emptyForm, payload, localeTab, previewLocale, previewOpen });
    `)
    Badge = await compile('components/AdminStatusBadge.vue')
    Blocks = await compile('components/MediaStructuredBlockEditor.vue')
  })
  after(async () => { if (directory) await rm(directory, { recursive: true, force: true }) })

  async function render(arrange: (state: any) => void) {
    const component = { ...Page, setup(props: any, context: any) {
      let exposed: any
      const render = Page.setup(props, { ...context, expose(value: any) { exposed = value } })
      arrange(exposed)
      return render
    } }
    const app = createSSRApp(component)
    const Stub = defineComponent({ setup: (_, { slots }) => () => h('div', slots.default?.()) })
    for (const name of ['PageHead', 'BulkActionBar', 'MediaImageUploader']) app.component(name, Stub)
    app.component('AdminStatusBadge', Badge)
    app.component('MediaStructuredBlockEditor', Blocks)
    return renderToString(app)
  }

  it('reloads canonical ID body/SEO and preserves EN without mutating the loaded article', () => {
    const id = articleEditorTranslation(original, 'id')
    assert.deepEqual(id.body, original.translations.id.body)
    assert.equal(id.seoTitle, '')
    assert.equal(id.seoDescription, 'SEO deskripsi ID')
    id.body[0].text = 'Edited locally'
    assert.equal(original.translations.id.body[0].text, 'Body khusus Indonesia')
    assert.deepEqual(articleEditorTranslation(original, 'en').body, original.translations.en.body)
    const { translations, ...legacy } = original
    assert.deepEqual(articleEditorTranslation(legacy, 'id').body, legacy.body)
    assert.deepEqual(articleEditorTranslation(legacy, 'en').body, [])
  })
  it('renders English preview while the Indonesian editor remains bound to Indonesian state', async () => {
    const html = await render((state) => {
      state.editArticle(original)
      state.previewLocale.value = 'en'
      state.previewOpen.value = true
      assert.equal(state.form.seoTitle, '')
    })
    const [editor, preview] = html.split('aria-label="Preview artikel"')
    assert.ok(preview)
    assert.match(editor, /Body khusus Indonesia/)
    assert.doesNotMatch(editor, /English preview body/)
    assert.match(preview, /English title/)
    assert.match(preview, /English excerpt/)
    assert.match(preview, /English preview body/)
    assert.match(preview, /alt="English alt"/)
    assert.doesNotMatch(preview, /Body khusus Indonesia|Stale body/)
  })
  it('renders ID preview and keeps save/preview actions accessible in the English tab', async () => {
    const html = await render((state) => {
      state.editArticle(original)
      state.localeTab.value = 'en'
      state.previewLocale.value = 'id'
      state.previewOpen.value = true
    })
    const [editor, preview] = html.split('aria-label="Preview artikel"')
    assert.match(editor, /English preview body/)
    assert.match(editor, /Simpan Perubahan/)
    assert.match(editor, /Tutup Preview/)
    assert.match(preview, /Body khusus Indonesia/)
    assert.match(preview, /alt="Alt Indonesia"/)
    assert.doesNotMatch(preview, /English preview body/)
  })
  it('does not fall back to ID content when an empty EN preview is selected', async () => {
    const html = await render((state) => {
      state.editArticle({ ...original, translations: { id: original.translations.id } })
      state.localeTab.value = 'en'
      state.previewLocale.value = 'en'
      state.previewOpen.value = true
    })
    const preview = html.split('aria-label="Preview artikel"')[1]
    assert.ok(preview)
    assert.doesNotMatch(preview, /Judul Indonesia|Ringkasan Indonesia|Body khusus Indonesia|Alt Indonesia|Stale/)
  })
  it('renders readiness badges and exactly one English filter', async () => {
    const html = await render((state) => {
      state.articles.value = [original, { ...original, id: 2, translations: { id: original.translations.id } }]
    })
    assert.match(html, /ID ✓/)
    assert.match(html, /EN ✓/)
    assert.match(html, /EN —/)
    assert.equal((html.match(/Belum Lengkap/g) || []).length, 1)
  })
  it('sends only canonical localized fields and preserves status, publication time, and SEO', async () => {
    await render((state) => {
      state.editArticle(original)
      const payload = state.payload(state.form.status)
      assert.equal('title' in payload, false)
      assert.equal('slug' in payload, false)
      assert.equal('body' in payload, false)
      assert.equal(payload.translations.id.title, 'Judul Indonesia')
      assert.equal(payload.translations.id.seoTitle, null)
      assert.equal(payload.translations.id.seoDescription, 'SEO deskripsi ID')
      assert.equal(payload.translations.en.seoTitle, 'English SEO')
      assert.equal(payload.status, 'PUBLISHED')
      assert.equal(payload.publishedAt, original.publishedAt)
      assert.equal(payload.ogImage, '/og.jpg')
      state.emptyForm()
      assert.equal(state.form.seoDescription, '')
      assert.deepEqual(state.enTranslation.body, [])
    })
  })
})
