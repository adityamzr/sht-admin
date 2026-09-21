import type { ArticleBlock } from './article-localization'

export type RichTextMark =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'link'; attrs: { href: string } }

export type RichTextNode = {
  type: 'doc' | 'paragraph' | 'text' | 'heading' | 'bulletList' | 'orderedList' | 'listItem' | 'blockquote' | 'hardBreak'
  text?: string
  attrs?: { level?: 2 | 3 }
  marks?: RichTextMark[]
  content?: RichTextNode[]
}

export type RichTextDocument = RichTextNode & { type: 'doc'; content: RichTextNode[] }

export const RICH_TEXT_LIMITS = {
  maxNodes: 2_000,
  maxTextLength: 100_000,
  maxDepth: 8,
} as const

const RICH_TEXT_NODES = new Set(['doc', 'paragraph', 'text', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'hardBreak'])

export function createEmptyRichTextDocument(): RichTextDocument {
  return { type: 'doc', content: [{ type: 'paragraph', content: [] }] }
}

export function sanitizeRichTextLink(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const href = value.trim()
  if (!href || /[\u0000-\u001F\u007F]/.test(href)) return null
  if (href.startsWith('/') && !href.startsWith('//')) return href
  if (href.startsWith('#')) return href
  try {
    const url = new URL(href)
    return ['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol) ? href : null
  } catch {
    return null
  }
}

function normalizeMarks(value: unknown): RichTextMark[] | undefined {
  if (!Array.isArray(value)) return undefined
  const marks: RichTextMark[] = []
  for (const mark of value) {
    if (!mark || typeof mark !== 'object') continue
    const type = (mark as any).type
    if ((type === 'bold' || type === 'italic') && !marks.some(item => item.type === type)) marks.push({ type })
    if (type === 'link') {
      const href = sanitizeRichTextLink((mark as any).attrs?.href)
      if (href && !marks.some(item => item.type === 'link')) marks.push({ type: 'link', attrs: { href } })
    }
  }
  return marks.length ? marks : undefined
}

function normalizeNode(value: unknown, depth: number): RichTextNode | null {
  if (!value || typeof value !== 'object' || depth > RICH_TEXT_LIMITS.maxDepth) return null
  const source = value as Record<string, unknown>
  const type = typeof source.type === 'string' ? source.type : ''
  if (!RICH_TEXT_NODES.has(type)) return null
  if (type === 'text') {
    return { type, text: typeof source.text === 'string' ? source.text : '', marks: normalizeMarks(source.marks) }
  }
  if (type === 'hardBreak') return { type }
  const content = Array.isArray(source.content)
    ? source.content.map(node => normalizeNode(node, depth + 1)).filter((node): node is RichTextNode => Boolean(node))
    : []
  if (type === 'heading') {
    const level = (source.attrs as any)?.level === 3 ? 3 : 2
    return { type, attrs: { level }, content }
  }
  return { type: type as RichTextNode['type'], content }
}

export function normalizeRichTextDocument(value: unknown): RichTextDocument {
  const normalized = normalizeNode(value, 0)
  if (!normalized || normalized.type !== 'doc') return createEmptyRichTextDocument()
  return { type: 'doc', content: normalized.content?.length ? normalized.content : [{ type: 'paragraph', content: [] }] }
}

function textNodes(value: string): RichTextNode[] {
  const lines = value.split('\n')
  return lines.flatMap((line, index) => [
    ...(index ? [{ type: 'hardBreak' as const }] : []),
    ...(line ? [{ type: 'text' as const, text: line }] : []),
  ])
}

function legacyNode(block: ArticleBlock): RichTextNode | null {
  if (block.type === 'paragraph') return { type: 'paragraph', content: textNodes(block.text ?? '') }
  if (block.type === 'heading') return { type: 'heading', attrs: { level: block.level === 3 ? 3 : 2 }, content: textNodes(block.text ?? '') }
  if (block.type === 'blockquote') return { type: 'blockquote', content: [{ type: 'paragraph', content: textNodes(block.text ?? '') }] }
  if (block.type === 'list') {
    return {
      type: block.ordered ? 'orderedList' : 'bulletList',
      content: (block.items ?? []).map(item => ({ type: 'listItem', content: [{ type: 'paragraph', content: textNodes(item) }] })),
    }
  }
  return null
}

export function legacyBlocksToHybridBody(blocks: ArticleBlock[]): ArticleBlock[] {
  const output: ArticleBlock[] = []
  let run: RichTextNode[] = []
  const flush = () => {
    if (!run.length) return
    output.push({ type: 'richText', content: { type: 'doc', content: run } })
    run = []
  }
  for (const source of blocks ?? []) {
    const block = JSON.parse(JSON.stringify(source)) as ArticleBlock
    const converted = legacyNode(block)
    if (converted) {
      run.push(converted)
      continue
    }
    flush()
    if (block.type === 'richText') block.content = normalizeRichTextDocument(block.content)
    output.push(block)
  }
  flush()
  return output
}

export function extractRichTextDocumentText(value: unknown): string {
  const document = normalizeRichTextDocument(value)
  const parts: string[] = []
  const visit = (node: RichTextNode) => {
    if (node.type === 'text') parts.push(node.text ?? '')
    else if (node.type === 'hardBreak') parts.push('\n')
    else {
      node.content?.forEach(visit)
      if (['paragraph', 'heading', 'listItem', 'blockquote'].includes(node.type)) parts.push('\n')
    }
  }
  document.content.forEach(visit)
  return parts.join('').replace(/\n{2,}/g, '\n').trim()
}

export function isRichTextDocumentEmpty(value: unknown): boolean {
  return !extractRichTextDocumentText(value).trim()
}

export function extractArticleBodyText(blocks: ArticleBlock[]): string {
  return (blocks ?? []).flatMap(block => {
    if (block.type === 'richText') return extractRichTextDocumentText(block.content)
    if (block.type === 'list') return block.items ?? []
    if (block.type === 'table') return [block.caption ?? '', ...(block.headers ?? []), ...(block.rows ?? []).flat()]
    return [block.text ?? '', block.caption ?? '', block.alt ?? '']
  }).filter(Boolean).join('\n').trim()
}

export function isMeaningfulArticleBody(blocks: unknown): boolean {
  if (!Array.isArray(blocks)) return false
  return blocks.some((block: any) => {
    if (!block || typeof block !== 'object') return false
    if (block.type === 'richText') return !isRichTextDocumentEmpty(block.content)
    if (block.type === 'list') return Array.isArray(block.items) && block.items.some((item: unknown) => typeof item === 'string' && item.trim())
    if (block.type === 'image') return typeof block.src === 'string' && Boolean(block.src.trim())
    if (block.type === 'table') return [...(block.headers ?? []), ...(block.rows ?? []).flat()].some((cell: unknown) => typeof cell === 'string' && cell.trim())
    return typeof block.text === 'string' && Boolean(block.text.trim())
  })
}
