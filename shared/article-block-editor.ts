import type { ArticleBlock } from './article-localization'

export function createArticleBlock(type: ArticleBlock['type']): ArticleBlock {
  if (type === 'heading') return { type, level: 2, text: '' }
  if (type === 'list') return { type, ordered: false, items: [''] }
  if (type === 'image') return { type, src: '', alt: '', caption: '', displaySize: 'medium', aspectRatio: 'auto' }
  return { type, text: '' }
}
export function insertArticleBlock(blocks: ArticleBlock[], type: ArticleBlock['type'], index = blocks.length) { const next = [...blocks]; next.splice(index, 0, createArticleBlock(type)); return next }
export function moveArticleBlock(blocks: ArticleBlock[], from: number, to: number) { if (to < 0 || to >= blocks.length || from === to) return blocks; const next = [...blocks]; const [block] = next.splice(from, 1); if (block) next.splice(to, 0, block); return next }
