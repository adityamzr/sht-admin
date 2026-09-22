import { getPageSettings, savePageSettings, saveHomePageSettings, saveLinkBioSettings } from '~/server/services/page-settings'
import { deleteImageKitFile } from '~/server/services/imagekit'
import { useDb } from '~/server/db'
import { pageSettingsInput, homePageSettingsInput, linkBioInput, pageSettingsKeys } from '~/server/utils/validators'
export default defineEventHandler(async (event) => {
  const page = String(getRouterParam(event, 'page') || '')
  if (!pageSettingsKeys.includes(page as any)) throw createError({ statusCode: 404, statusMessage: 'Page settings tidak ditemukan.' })
  const input = await readBody(event)
  const db = useDb()
  const previous = await getPageSettings(db, page)
  let data
  try {
    if (page === 'home') {
      const parsed = homePageSettingsInput.safeParse(input)
      if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message || 'Pengaturan tidak valid.' })
      data = await saveHomePageSettings(db, parsed.data)
    } else if (page === 'link-bio') {
      const parsed = linkBioInput.safeParse(input)
      if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message || 'Pengaturan Link Bio tidak valid.' })
      data = await saveLinkBioSettings(db, parsed.data)
    } else {
      const parsed = pageSettingsInput.safeParse(input)
      if (!parsed.success) throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message || 'Pengaturan tidak valid.' })
      data = await savePageSettings(db, page, parsed.data)
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error && (error as any).statusCode === 400) throw error
    throw createError({ statusCode: 500, statusMessage: 'Pengaturan gagal disimpan.' })
  }
  // Asset cleanup only after the complete Home transaction has committed.
  if (page === 'home' && previous?.heroImageFileId && previous.heroImageFileId !== (data as any)?.heroImageFileId) {
    try { await deleteImageKitFile(previous.heroImageFileId) }
    catch { console.warn('[page-settings] old hero ImageKit cleanup failed') }
  }
  return { data }
})
