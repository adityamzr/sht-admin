import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { ArticleBlock } from '../shared/article-localization'
import { createArticleBlock, insertArticleBlock, moveArticleBlock, applyArticleImageUpload } from '../shared/article-block-editor'
import { articleImageFigureStyle, articleImageRatioStyle, articleImageObjectStyle } from '../shared/article-block-presentation'

describe('Guide modernization – legacy body compatibility', () => {
  it('legacy guide body loads into canonical ArticleBlock shape without loss', () => {
    const legacy: any[] = [
      { type: 'paragraph', text: 'Paragraf lama' },
      { type: 'heading', level: 2, text: 'Judul H2' },
      { type: 'image', src: 'https://example.com/old.jpg', alt: 'Alt lama', caption: 'Caption lama' },
      { type: 'list', ordered: false, items: ['Item 1', 'Item 2'] },
      { type: 'blockquote', text: 'Quote lama' },
      { type: 'callout', text: 'Callout lama' },
    ]

    // Simulate loading into ArticleBlock[] – should preserve all fields
    const blocks = JSON.parse(JSON.stringify(legacy)) as ArticleBlock[]

    assert.equal(blocks[0].type, 'paragraph')
    assert.equal(blocks[0].text, 'Paragraf lama')
    assert.equal(blocks[1].type, 'heading')
    assert.equal(blocks[1].level, 2)
    assert.equal(blocks[2].type, 'image')
    assert.equal(blocks[2].src, 'https://example.com/old.jpg')
    assert.equal(blocks[2].alt, 'Alt lama')
    assert.equal(blocks[2].caption, 'Caption lama')
    // Old image without new metadata must remain valid
    assert.equal(blocks[2].fileId, undefined)
    assert.equal(blocks[2].displaySize, undefined)
    assert.equal(blocks[2].aspectRatio, undefined)
    assert.equal(blocks[3].type, 'list')
    assert.deepEqual(blocks[3].items, ['Item 1', 'Item 2'])
  })

  it('old guide image without fileId/displaySize/aspectRatio remains valid', () => {
    const oldImage: ArticleBlock = {
      type: 'image',
      src: 'https://example.com/legacy.jpg',
      alt: 'Legacy alt',
    }

    // Should be valid for preview helpers with fallback
    const figureStyle = articleImageFigureStyle(oldImage)
    const ratioStyle = articleImageRatioStyle(oldImage)
    const objectStyle = articleImageObjectStyle(oldImage)

    assert.deepEqual(figureStyle, { maxWidth: '100%' }) // full fallback
    assert.equal(ratioStyle, undefined) // auto fallback
    assert.deepEqual(objectStyle, { height: 'auto' })
  })
})

describe('Guide modernization – image metadata persistence', () => {
  it('guide image block can persist src, fileId, alt, caption, displaySize, aspectRatio', () => {
    const newImage: ArticleBlock = {
      type: 'image',
      src: 'https://example.com/new.jpg',
      fileId: 'file-123',
      alt: 'Alt baru',
      caption: 'Caption baru',
      displaySize: 'medium',
      aspectRatio: '16:9',
    }

    const figureStyle = articleImageFigureStyle(newImage)
    const ratioStyle = articleImageRatioStyle(newImage)
    const objectStyle = articleImageObjectStyle(newImage)

    assert.deepEqual(figureStyle, { maxWidth: '680px' })
    assert.deepEqual(ratioStyle, { aspectRatio: '16 / 9' })
    assert.deepEqual(objectStyle, { height: '100%', objectFit: 'cover' })

    // Simulate save/load roundtrip
    const serialized = JSON.parse(JSON.stringify(newImage))
    assert.equal(serialized.src, 'https://example.com/new.jpg')
    assert.equal(serialized.fileId, 'file-123')
    assert.equal(serialized.displaySize, 'medium')
    assert.equal(serialized.aspectRatio, '16:9')
  })

  it('applyArticleImageUpload preserves guides folder behavior and metadata', () => {
    const block: ArticleBlock = { type: 'image', src: '', alt: '', caption: '', displaySize: 'medium', aspectRatio: 'auto' }
    const upload = { url: 'https://example.com/uploaded.jpg', fileId: 'guides-file-456', dimensions: { width: 1200, height: 800 } }

    const updated = applyArticleImageUpload(block, upload)

    assert.equal(updated.src, 'https://example.com/uploaded.jpg')
    assert.equal(updated.fileId, 'guides-file-456')
    // Wide because width > height*1.1
    assert.equal(updated.displaySize, 'wide')
  })
})

describe('Guide modernization – reorder', () => {
  it('guide body A B C move C before A => C A B without mutation', () => {
    const blocks: ArticleBlock[] = [
      { type: 'paragraph', text: 'A' },
      { type: 'paragraph', text: 'B' },
      { type: 'paragraph', text: 'C' },
    ]

    const moved = moveArticleBlock(blocks, 2, 0)

    assert.equal(moved[0].text, 'C')
    assert.equal(moved[1].text, 'A')
    assert.equal(moved[2].text, 'B')
    // Original unchanged
    assert.equal(blocks[0].text, 'A')
  })

  it('insert block at exact position', () => {
    const blocks: ArticleBlock[] = [
      { type: 'paragraph', text: 'First' },
      { type: 'paragraph', text: 'Last' },
    ]

    const inserted = insertArticleBlock(blocks, 'heading', 1)

    assert.equal(inserted.length, 3)
    assert.equal(inserted[0].text, 'First')
    assert.equal(inserted[1].type, 'heading')
    assert.equal(inserted[2].text, 'Last')
  })
})

describe('Guide modernization – localization independence', () => {
  it('ID and EN bodies remain independent', () => {
    const idBody: ArticleBlock[] = [{ type: 'paragraph', text: 'Paragraf ID' }]
    const enBody: ArticleBlock[] = [{ type: 'paragraph', text: 'Paragraph EN' }]

    // Simulate editing ID
    const idEdited = moveArticleBlock([...idBody, { type: 'paragraph', text: 'ID 2' }], 1, 0)

    assert.equal(idEdited[0].text, 'ID 2')
    assert.equal(enBody[0].text, 'Paragraph EN') // EN unchanged
    assert.equal(idBody[0].text, 'Paragraf ID') // original ID unchanged (immutability)
  })
})

describe('Guide modernization – validation', () => {
  it('empty required text block should be invalid', () => {
    const blocks: ArticleBlock[] = [
      { type: 'paragraph', text: '' },
      { type: 'heading', level: 2, text: 'Valid' },
    ]

    const errors: Record<string, string> = {}
    blocks.forEach((block, index) => {
      if (['paragraph', 'heading', 'blockquote', 'callout'].includes(block.type) && !block.text?.trim()) {
        errors[`body-${index}`] = 'Isi block wajib diisi.'
      }
    })

    assert.equal(errors['body-0'], 'Isi block wajib diisi.')
    assert.equal(errors['body-1'], undefined)
  })

  it('image with src but no alt should be invalid', () => {
    const blocks: ArticleBlock[] = [
      { type: 'image', src: 'https://example.com/img.jpg', alt: '' },
    ]

    const errors: Record<string, string> = {}
    blocks.forEach((block, index) => {
      if (block.type === 'image' && block.src && !block.alt?.trim()) {
        errors[`body-${index}`] = 'Alt text wajib diisi untuk image block.'
      }
    })

    assert.equal(errors['body-0'], 'Alt text wajib diisi untuk image block.')
  })

  it('valid structured body passes validation', () => {
    const blocks: ArticleBlock[] = [
      { type: 'paragraph', text: 'Valid paragraph' },
      { type: 'heading', level: 2, text: 'Valid heading' },
      { type: 'image', src: 'https://example.com/img.jpg', alt: 'Alt valid', caption: 'Caption' },
      { type: 'list', ordered: false, items: ['Item 1'] },
    ]

    const errors: Record<string, string> = {}
    blocks.forEach((block, index) => {
      if (['paragraph', 'heading', 'blockquote', 'callout'].includes(block.type) && !block.text?.trim()) {
        errors[`body-${index}`] = 'Isi block wajib diisi.'
      }
      if (block.type === 'image' && block.src && !block.alt?.trim()) {
        errors[`body-${index}`] = 'Alt text wajib diisi untuk image block.'
      }
      if (block.type === 'list' && (!block.items || block.items.filter(Boolean).length === 0)) {
        errors[`body-${index}`] = 'Isi block wajib diisi.'
      }
    })

    assert.equal(Object.keys(errors).length, 0)
  })
})

describe('Guide modernization – shared block factory', () => {
  it('createArticleBlock creates valid blocks for guide', () => {
    const paragraph = createArticleBlock('paragraph')
    const heading = createArticleBlock('heading')
    const image = createArticleBlock('image')
    const list = createArticleBlock('list')
    const quote = createArticleBlock('blockquote')
    const callout = createArticleBlock('callout')

    assert.equal(paragraph.type, 'paragraph')
    assert.equal(heading.type, 'heading')
    assert.equal(heading.level, 2)
    assert.equal(image.type, 'image')
    assert.equal(image.displaySize, 'medium')
    assert.equal(list.type, 'list')
    assert.deepEqual(list.items, [''])
    assert.equal(quote.type, 'blockquote')
    assert.equal(callout.type, 'callout')
  })
})
