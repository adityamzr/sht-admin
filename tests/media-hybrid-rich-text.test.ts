import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  createEmptyRichTextDocument,
  extractArticleBodyText,
  isMeaningfulArticleBody,
  isRichTextDocumentEmpty,
  legacyBlocksToHybridBody,
  normalizeRichTextDocument,
  sanitizeRichTextLink,
} from '../shared/rich-text'
import type { ArticleBlock } from '../shared/article-localization'
import { articleInput } from '../server/utils/validators'

describe('Media hybrid rich text', () => {
  it('creates an empty document that is not meaningful publication content', () => {
    const document = createEmptyRichTextDocument()
    assert.equal(isRichTextDocumentEmpty(document), true)
    assert.equal(isMeaningfulArticleBody([{ type: 'richText', content: document }]), false)
  })

  it('converts consecutive legacy text runs without crossing special blocks', () => {
    const image = { type: 'image', src: '/image.jpg', fileId: 'file-1', alt: 'Alt', caption: 'Caption', displaySize: 'wide', aspectRatio: '16:9' } as const
    const table = { type: 'table', caption: 'Data', headers: ['A', 'B'], rows: [['1', '2']], alignments: ['left', 'right'] } as ArticleBlock
    const legacy: ArticleBlock[] = [
      { type: 'paragraph', text: 'A\nB' },
      { type: 'heading', level: 2, text: 'C' },
      { type: 'list', ordered: true, items: ['D', 'E'] },
      { type: 'blockquote', text: 'F' },
      image,
      { type: 'paragraph', text: 'G' },
      table,
    ]
    const hybrid = legacyBlocksToHybridBody(legacy)

    assert.deepEqual(hybrid.map(block => block.type), ['richText', 'image', 'richText', 'table'])
    assert.equal(extractArticleBodyText(hybrid), 'A\nB\nC\nD\nE\nF\nCaption\nAlt\nG\nData\nA\nB\n1\n2')
    assert.deepEqual(hybrid[1], image)
    assert.deepEqual(hybrid[3], table)
  })

  it('deep-clones localized bodies so ID mutations cannot change EN', () => {
    const source: ArticleBlock[] = [{ type: 'paragraph', text: 'Makkah' }]
    const id = legacyBlocksToHybridBody(source)
    const en = legacyBlocksToHybridBody([{ type: 'paragraph', text: 'Mecca' }])
    ;(id[0]?.content?.content?.[0]?.content?.[0] as any).text = 'Makkah Al-Mukarramah'
    assert.equal(extractArticleBodyText(en), 'Mecca')
    assert.equal(source[0]?.text, 'Makkah')
  })

  it('keeps script-looking text as inert text and strips unknown document attributes', () => {
    const normalized = normalizeRichTextDocument({
      type: 'doc',
      evil: 'attribute',
      content: [{ type: 'paragraph', style: 'color:red', content: [{ type: 'text', text: '<script>alert(1)</script>' }] }],
    })
    assert.equal(extractArticleBodyText([{ type: 'richText', content: normalized }]), '<script>alert(1)</script>')
    assert.equal('evil' in normalized, false)
    assert.equal('style' in (normalized.content[0] as any), false)
  })

  it('allows editorial URL protocols and rejects executable schemes', () => {
    assert.equal(sanitizeRichTextLink('https://example.com'), 'https://example.com')
    assert.equal(sanitizeRichTextLink('/panduan'), '/panduan')
    assert.equal(sanitizeRichTextLink('#bagian'), '#bagian')
    assert.equal(sanitizeRichTextLink('mailto:admin@example.com'), 'mailto:admin@example.com')
    assert.equal(sanitizeRichTextLink('javascript:alert(1)'), null)
    assert.equal(sanitizeRichTextLink('data:text/html,boom'), null)
  })

  it('server accepts the canonical schema and rejects unsafe rich-text links', () => {
    const base = {
      heroImage: '', city: 'GENERAL', contentType: 'article', category: 'Kehidupan', tags: [], status: 'DRAFT', priority: 0,
      translations: { id: { title: 'Judul aman', slug: 'judul-aman', excerpt: '', heroAlt: '', body: [{ type: 'richText', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Aman', marks: [{ type: 'bold' }] }] }] } }] } },
    }
    assert.equal(articleInput.safeParse(base).success, true)
    const unsafe = structuredClone(base)
    ;(unsafe.translations.id.body[0] as any).content.content[0].content[0].marks = [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]
    assert.equal(articleInput.safeParse(unsafe).success, false)
  })
})
