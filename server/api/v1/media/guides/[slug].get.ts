import { getPublishedGuideBySlug, getGuideTranslations } from '~/server/services/guides'
import { useDb } from '~/server/db'
import { publicGuide } from '~/server/utils/serializers'
import { parseLocale } from '~/server/utils/locales'
import { mediaLocaleLinks, isCompleteGuideTranslation } from '~/shared/media-localization'
export default defineEventHandler(async (event) => {
  const locale = parseLocale(getQuery(event).locale)
  const db = useDb()
  const row = await getPublishedGuideBySlug(db, getRouterParam(event, 'slug') ?? '', locale)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Panduan atau terjemahan belum tersedia.' })
  const texts = await getGuideTranslations(db, row.id)
  const links = (texts.length ? mediaLocaleLinks(texts, isCompleteGuideTranslation) : { availableLocales: ['id'], localizedSlugs: { id: row.slug } })
  return { data: { ...publicGuide(row), ...links } }
})
