import type { ArticleBlock } from './article-localization'

export type ArticleImageBlock = ArticleBlock & { type: 'image' }

export function articleImageFigureStyle(block: Pick<ArticleBlock, 'displaySize'>) {
  return {
    maxWidth: {
      small: '480px',
      medium: '680px',
      wide: '900px',
      full: '100%',
    }[block.displaySize ?? 'full'],
  }
}

export function articleImageRatioStyle(block: Pick<ArticleBlock, 'aspectRatio'>) {
  const aspectRatio = {
    auto: undefined,
    '16:9': '16 / 9',
    '4:5': '4 / 5',
    '1:1': '1 / 1',
  }[block.aspectRatio ?? 'auto']

  return aspectRatio ? { aspectRatio } : undefined
}

export function articleImageObjectStyle(block: Pick<ArticleBlock, 'aspectRatio'>) {
  return (block.aspectRatio ?? 'auto') === 'auto'
    ? { height: 'auto' }
    : { height: '100%', objectFit: 'cover' as const }
}
