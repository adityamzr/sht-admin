import { getPublishedGallery, getGalleryTranslations } from '~/server/services/gallery'
import { publicGallery } from '~/server/utils/serializers'
import { useDb } from '~/server/db'
import { parseLocale } from '~/server/utils/locales'
import { mediaLocaleLinks, isCompleteGalleryTranslation } from '~/shared/media-localization'
export default defineEventHandler(async (event) => {
  const locale = parseLocale(getQuery(event).locale), db = useDb()
  const row = await getPublishedGallery(db, Number(getRouterParam(event, 'id')), locale)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Gallery atau terjemahan belum tersedia.' })
  const texts = await getGalleryTranslations(db, row.id)
  return { data: { ...publicGallery(row), ...(texts.length ? mediaLocaleLinks(texts, isCompleteGalleryTranslation) : { availableLocales: ['id'] }) } }
})
