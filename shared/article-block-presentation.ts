import type { ArticleBlock } from './article-localization'

export type ArticleImageBlock = ArticleBlock & { type: 'image' }

export function articleImageFigureClass(block: Pick<ArticleBlock, 'displaySize'>) {
  return {
    small: 'max-w-[480px]',
    medium: 'max-w-[680px]',
    wide: 'max-w-[900px]',
    full: 'max-w-none',
  }[block.displaySize ?? 'full']
}

export function articleImageRatioClass(block: Pick<ArticleBlock, 'aspectRatio'>) {
  return {
    auto: '',
    '16:9': 'aspect-video',
    '4:5': 'aspect-[4/5]',
    '1:1': 'aspect-square',
  }[block.aspectRatio ?? 'auto']
}

export function articleImageObjectClass(block: Pick<ArticleBlock, 'aspectRatio'>) {
  return (block.aspectRatio ?? 'auto') === 'auto' ? 'h-auto' : 'h-full object-cover'
}
