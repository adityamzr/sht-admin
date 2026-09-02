import { getActiveLocation, getLocationTranslations } from '~/server/services/map-locations'
import { publicMapLocation } from '~/server/utils/serializers'
import { useDb } from '~/server/db'
import { parseLocale } from '~/server/utils/locales'
import { mediaLocaleLinks, isCompleteLocationTranslation } from '~/shared/media-localization'
export default defineEventHandler(async (event) => {
  const locale = parseLocale(getQuery(event).locale), db = useDb()
  const row = await getActiveLocation(db, Number(getRouterParam(event, 'id')), locale)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Lokasi atau terjemahan belum tersedia.' })
  const texts = await getLocationTranslations(db, row.id)
  return { data: { ...publicMapLocation(row), ...(texts.length ? mediaLocaleLinks(texts, isCompleteLocationTranslation) : { availableLocales: ['id'] }) } }
})
