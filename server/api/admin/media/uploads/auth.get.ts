import { getImageKitConfig } from '~/server/services/imagekit'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const folder = typeof query.folder === 'string' ? query.folder : 'articles'
  return getImageKitConfig(folder)
})
