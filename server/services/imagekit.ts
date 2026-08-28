import ImageKit from '@imagekit/nodejs'

const allowedFolders = new Set(['articles', 'gallery', 'guides', 'locations'])

export function getImageKitConfig(folder = 'articles') {
  const config = useRuntimeConfig()
  const privateKey = String(config.imagekitPrivateKey || '')
  const publicKey = String(config.public.imagekitPublicKey || '')
  const urlEndpoint = String(config.public.imagekitUrlEndpoint || '')
  if (!privateKey || !publicKey || !urlEndpoint) {
    throw createError({ statusCode: 503, statusMessage: 'ImageKit belum dikonfigurasi.' })
  }
  const safeFolder = allowedFolders.has(folder) ? folder : 'articles'
  const client = new ImageKit({ privateKey })
  const auth = client.helper.getAuthenticationParameters()
  return { ...auth, publicKey, urlEndpoint, folder: `/media/${safeFolder}` }
}
