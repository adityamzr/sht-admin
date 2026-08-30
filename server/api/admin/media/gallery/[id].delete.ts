import { deleteGallery, getGallery } from '~/server/services/gallery'
import { deleteImageKitFile } from '~/server/services/imagekit'
import { useDb } from '~/server/db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const item = await getGallery(db, id)
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Gallery item tidak ditemukan.' })
  if (item.imageFileId) {
    try { await deleteImageKitFile(item.imageFileId) } catch (error) { console.error('[gallery] ImageKit delete failed', { id, fileId: item.imageFileId, error }); throw createError({ statusCode: 502, statusMessage: 'Asset ImageKit gagal dihapus. Gallery item tetap tersimpan, silakan coba lagi.' }) }
  } else console.warn('[gallery] deleted without ImageKit fileId', { id })
  const deleted = await deleteGallery(db, id)
  if (!deleted) throw createError({ statusCode: 404, statusMessage: 'Gallery item tidak ditemukan.' })
  return { ok: true, id: deleted.id, remoteAssetDeleted: Boolean(item.imageFileId), remoteAssetCleanup: item.imageFileId ? 'deleted' : 'fileId_missing' }
})
