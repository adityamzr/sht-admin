import { deleteArticle, getArticle } from '~/server/services/articles'
import { deleteImageKitFile } from '~/server/services/imagekit'
import { useDb } from '~/server/db'

function bodyFileIds(body: unknown) { return Array.isArray(body) ? body.flatMap((block: any) => block?.type === 'image' && typeof block.fileId === 'string' ? [block.fileId] : []) : [] }
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id')); const db = useDb(); const article = await getArticle(db, id)
  if (!article) throw createError({ statusCode: 404, statusMessage: 'Artikel tidak ditemukan.' })
  const fileIds = [...new Set([article.heroImageFileId, ...bodyFileIds(article.body)].filter((v): v is string => Boolean(v)))]
  try { for (const fileId of fileIds) await deleteImageKitFile(fileId) } catch (error) { console.error('[article] ImageKit delete failed', { id, error }); throw createError({ statusCode: 502, statusMessage: 'Asset ImageKit artikel gagal dihapus. Artikel tetap tersimpan, silakan coba lagi.' }) }
  const deleted = await deleteArticle(db, id); if (!deleted) throw createError({ statusCode: 404, statusMessage: 'Artikel tidak ditemukan.' })
  if (!fileIds.length) console.warn('[article] deleted without ImageKit fileIds', { id })
  return { ok: true, id: deleted.id, remoteAssetsDeleted: fileIds.length, remoteAssetCleanup: fileIds.length ? 'deleted' : 'fileId_missing' }
})
