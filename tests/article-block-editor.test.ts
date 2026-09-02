import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createArticleBlock, insertArticleBlock, moveArticleBlock } from '../shared/article-block-editor'
import { articleInput } from '../server/utils/validators'

describe('Article block editor enhancement', () => {
  it('inserts at an exact position and reorders without losing content', () => {
    const original = [{ type: 'paragraph' as const, text: 'A' }, { type: 'paragraph' as const, text: 'B' }]
    const inserted = insertArticleBlock(original, 'heading', 1)
    assert.deepEqual(inserted.map((block) => block.type), ['paragraph', 'heading', 'paragraph'])
    assert.deepEqual(original.map((block) => block.text), ['A', 'B'])
    const moved = moveArticleBlock(inserted, 2, 0)
    assert.equal(moved[0]?.text, 'B')
    assert.equal(moved[2]?.text, '')
  })
  it('gives new images safe smart-default metadata while old images remain valid', () => {
    assert.deepEqual(createArticleBlock('image'), { type: 'image', src: '', alt: '', caption: '', displaySize: 'medium', aspectRatio: 'auto' })
    const parsed = articleInput.parse({ heroImage: '', city: 'GENERAL', contentType: 'article', category: 'Sains & Teknologi', tags: [], status: 'DRAFT', priority: 0, translations: { id: { title: 'Judul', slug: 'judul', excerpt: '', heroAlt: '', body: [{ type: 'image', src: '/old.jpg', alt: 'Old' }] } } })
    assert.equal(parsed.category, 'Sains & Teknologi')
    assert.deepEqual(parsed.translations.id.body[0], { type: 'image', src: '/old.jpg', alt: 'Old' })
  })
})
