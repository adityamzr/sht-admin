import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { applyArticleImageUpload, createArticleBlock, insertArticleBlock, moveArticleBlock } from '../shared/article-block-editor'
import { articleImageFigureStyle, articleImageObjectStyle, articleImageRatioStyle } from '../shared/article-block-presentation'
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
  it('applies uploaded URL, file ID, and smart size atomically without losing caption', () => {
    const result = applyArticleImageUpload(
      { type: 'image', src: '', alt: 'Lantai Mataf', caption: 'Caption tetap ada.', displaySize: 'medium', aspectRatio: 'auto' },
      { url: 'https://ik.imagekit.io/sht/mataf.webp', fileId: 'file-123', dimensions: { width: 1600, height: 900 } },
    )
    assert.equal(result.src, 'https://ik.imagekit.io/sht/mataf.webp')
    assert.equal(result.fileId, 'file-123')
    assert.equal(result.displaySize, 'wide')
    assert.equal(result.caption, 'Caption tetap ada.')
  })
  it('maps image size and crop settings to explicit presentation styles', () => {
    assert.deepEqual(articleImageFigureStyle({ displaySize: 'small' }), { maxWidth: '480px' })
    assert.deepEqual(articleImageFigureStyle({ displaySize: 'wide' }), { maxWidth: '900px' })
    assert.deepEqual(articleImageRatioStyle({ aspectRatio: '4:5' }), { aspectRatio: '4 / 5' })
    assert.deepEqual(articleImageObjectStyle({ aspectRatio: '4:5' }), { height: '100%', objectFit: 'cover' })
    assert.equal(articleImageRatioStyle({ aspectRatio: 'auto' }), undefined)
    assert.deepEqual(articleImageObjectStyle({ aspectRatio: 'auto' }), { height: 'auto' })
  })
})
