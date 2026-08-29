import ImageKit from '@imagekit/nodejs'

const allowedFolders = new Set(['articles', 'gallery', 'guides', 'locations', 'home'])

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

/** Permanently deletes one ImageKit asset using the server-side private key. */
export async function deleteImageKitFile(fileId: string) {
  const config = useRuntimeConfig()
  const privateKey = String(config.imagekitPrivateKey || '')
  if (!privateKey) throw createError({ statusCode: 503, statusMessage: 'ImageKit belum dikonfigurasi untuk cleanup.' })
  const client = new ImageKit({ privateKey })
  await client.files.delete(fileId)
}
