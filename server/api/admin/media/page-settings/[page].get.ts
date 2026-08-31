import { getPageSettings, getHomeSettings } from '~/server/services/page-settings'
import { useDb } from '~/server/db'
import { pageSettingsKeys } from '~/server/utils/validators'
export default defineEventHandler(async (event) => {
  const page = String(getRouterParam(event, 'page') || '')
  if (!pageSettingsKeys.includes(page as any)) throw createError({ statusCode: 404, statusMessage: 'Page settings tidak ditemukan.' })
  return { data: page === 'home' ? await getHomeSettings(useDb()) : await getPageSettings(useDb(), page) }
})
