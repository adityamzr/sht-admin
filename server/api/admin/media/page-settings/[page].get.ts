import { getPageSettings, getHomeSettings, getLinkBioSettings } from '~/server/services/page-settings'
import { useDb } from '~/server/db'
import { pageSettingsKeys } from '~/server/utils/validators'
export default defineEventHandler(async (event) => {
  const page = String(getRouterParam(event, 'page') || '')
  if (!pageSettingsKeys.includes(page as any)) throw createError({ statusCode: 404, statusMessage: 'Page settings tidak ditemukan.' })
  if (page === 'home') return { data: await getHomeSettings(useDb()) }
  if (page === 'link-bio') return { data: await getLinkBioSettings(useDb()) }
  return { data: await getPageSettings(useDb(), page) }
})
