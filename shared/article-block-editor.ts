import type { ArticleBlock } from './article-localization'
import { createEmptyRichTextDocument } from './rich-text'

export type TableAlignment = 'left' | 'center' | 'right'

export function createTableBlock(): ArticleBlock {
  return {
    type: 'table',
    caption: '',
    headers: ['Kolom 1', 'Kolom 2'],
    rows: [['', '']],
    alignments: ['left', 'left'],
  }
}

export function normalizeTableBlock(block: ArticleBlock): ArticleBlock {
  if (block.type !== 'table') return block

  let headers = Array.isArray(block.headers) ? [...block.headers] : []
  let rows = Array.isArray(block.rows) ? block.rows.map(r => Array.isArray(r) ? [...r] : []) : []
  let alignments = Array.isArray(block.alignments) ? [...block.alignments] as TableAlignment[] : []
  let caption = typeof block.caption === 'string' ? block.caption : ''

  // Enforce minimum 2 columns
  if (headers.length < 2) {
    const needed = 2 - headers.length
    for (let i = 0; i < needed; i++) headers.push(`Kolom ${headers.length + 1}`)
  }
  // Enforce maximum 12 columns (soft limit)
  if (headers.length > 12) {
    headers = headers.slice(0, 12)
  }

  // Alignments length must match headers
  if (alignments.length < headers.length) {
    const needed = headers.length - alignments.length
    for (let i = 0; i < needed; i++) alignments.push('left')
  }
  if (alignments.length > headers.length) {
    alignments = alignments.slice(0, headers.length)
  }
  // Validate alignments values
  alignments = alignments.map(a => (a === 'center' || a === 'right' ? a : 'left')) as TableAlignment[]

  // Enforce minimum 1 row
  if (rows.length < 1) {
    rows = [Array(headers.length).fill('')]
  }
  // Enforce maximum 100 rows (soft limit)
  if (rows.length > 100) {
    rows = rows.slice(0, 100)
  }

  // Normalize each row length to headers.length
  rows = rows.map(row => {
    let r = [...row]
    if (r.length < headers.length) {
      r = [...r, ...Array(headers.length - r.length).fill('')]
    }
    if (r.length > headers.length) {
      r = r.slice(0, headers.length)
    }
    return r.map(cell => typeof cell === 'string' ? cell : String(cell ?? ''))
  })

  // Ensure headers are strings
  headers = headers.map(h => typeof h === 'string' ? h : String(h ?? ''))

  return {
    ...block,
    caption,
    headers,
    rows,
    alignments,
  }
}

export function addTableColumn(block: ArticleBlock): ArticleBlock {
  if (block.type !== 'table') return block
  const normalized = normalizeTableBlock(block)
  const headers = [...(normalized.headers ?? [])]
  const rows = (normalized.rows ?? []).map(r => [...r])
  const alignments = [...(normalized.alignments ?? [])] as TableAlignment[]

  if (headers.length >= 12) return normalized // max columns

  headers.push(`Kolom ${headers.length + 1}`)
  rows.forEach(row => row.push(''))
  alignments.push('left')

  return { ...normalized, headers, rows, alignments }
}

export function deleteTableColumn(block: ArticleBlock, colIndex: number): ArticleBlock {
  if (block.type !== 'table') return block
  const normalized = normalizeTableBlock(block)
  let headers = [...(normalized.headers ?? [])]
  let rows = (normalized.rows ?? []).map(r => [...r])
  let alignments = [...(normalized.alignments ?? [])] as TableAlignment[]

  if (headers.length <= 2) return normalized // min columns
  if (colIndex < 0 || colIndex >= headers.length) return normalized

  headers.splice(colIndex, 1)
  rows = rows.map(r => {
    const nr = [...r]
    nr.splice(colIndex, 1)
    return nr
  })
  alignments.splice(colIndex, 1)

  return { ...normalized, headers, rows, alignments }
}

export function addTableRow(block: ArticleBlock): ArticleBlock {
  if (block.type !== 'table') return block
  const normalized = normalizeTableBlock(block)
  const headers = normalized.headers ?? []
  const rows = [...(normalized.rows ?? [])]

  if (rows.length >= 100) return normalized // max rows

  rows.push(Array(headers.length).fill(''))

  return { ...normalized, rows }
}

export function deleteTableRow(block: ArticleBlock, rowIndex: number): ArticleBlock {
  if (block.type !== 'table') return block
  const normalized = normalizeTableBlock(block)
  let rows = [...(normalized.rows ?? [])]

  if (rows.length <= 1) return normalized // min rows
  if (rowIndex < 0 || rowIndex >= rows.length) return normalized

  rows.splice(rowIndex, 1)

  return { ...normalized, rows }
}

export function updateTableHeader(block: ArticleBlock, colIndex: number, value: string): ArticleBlock {
  if (block.type !== 'table') return block
  const headers = [...(block.headers ?? [])]
  if (colIndex < 0 || colIndex >= headers.length) return block
  headers[colIndex] = value
  return { ...block, headers }
}

export function updateTableCell(block: ArticleBlock, rowIndex: number, colIndex: number, value: string): ArticleBlock {
  if (block.type !== 'table') return block
  const rows = (block.rows ?? []).map(r => [...r])
  if (rowIndex < 0 || rowIndex >= rows.length) return block
  if (colIndex < 0 || colIndex >= (rows[rowIndex]?.length ?? 0)) return block
  rows[rowIndex]![colIndex] = value
  return { ...block, rows }
}

export function updateTableAlignment(block: ArticleBlock, colIndex: number, alignment: TableAlignment): ArticleBlock {
  if (block.type !== 'table') return block
  const alignments = [...(block.alignments ?? [])] as TableAlignment[]
  if (colIndex < 0 || colIndex >= alignments.length) return block
  alignments[colIndex] = alignment
  return { ...block, alignments }
}

export function updateTableCaption(block: ArticleBlock, caption: string): ArticleBlock {
  if (block.type !== 'table') return block
  return { ...block, caption }
}

export function createArticleBlock(type: ArticleBlock['type']): ArticleBlock {
  if (type === 'richText') return { type, content: createEmptyRichTextDocument() }
  if (type === 'heading') return { type, level: 2, text: '' }
  if (type === 'list') return { type, ordered: false, items: [''] }
  if (type === 'image') return { type, src: '', alt: '', caption: '', displaySize: 'medium', aspectRatio: 'auto' }
  if (type === 'table') return createTableBlock()
  return { type, text: '' }
}
export function insertArticleBlock(blocks: ArticleBlock[], type: ArticleBlock['type'], index = blocks.length) { const next = [...blocks]; next.splice(index, 0, createArticleBlock(type)); return next }
export function moveArticleBlock(blocks: ArticleBlock[], from: number, to: number) { if (to < 0 || to >= blocks.length || from === to) return blocks; const next = [...blocks]; const [block] = next.splice(from, 1); if (block) next.splice(to, 0, block); return next }

export function applyArticleImageUpload(block: ArticleBlock, upload: { url: string; fileId: string; dimensions: { width: number; height: number } | null }): ArticleBlock {
  return {
    ...block,
    src: upload.url,
    fileId: upload.fileId,
    displaySize: upload.dimensions && upload.dimensions.width > upload.dimensions.height * 1.1 ? 'wide' : (block.displaySize ?? 'medium'),
    aspectRatio: block.aspectRatio ?? 'auto',
  }
}
