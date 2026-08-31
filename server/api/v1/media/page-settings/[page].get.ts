import { publicPageSettings } from '~/server/services/page-settings'
import { useDb } from '~/server/db'
import { pageSettingsKeys } from '~/server/utils/validators'
import { parseLocale } from '~/server/utils/locales'
export default defineEventHandler(async (event) => {
  const locale = parseLocale(getQuery(event).locale)
  const page = String(getRouterParam(event, 'page') || '')
  if (!pageSettingsKeys.includes(page as any)) throw createError({ statusCode: 404, statusMessage: 'Page settings tidak ditemukan.' })
  return { data: await publicPageSettings(useDb(), page, locale) }
})
