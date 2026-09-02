import { getGuideTranslations } from '~/server/services/guides'
import { getGuide } from '~/server/services/guides'
import { useDb } from '~/server/db'
import { adminGuide } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const row = await getGuide(useDb(), Number(getRouterParam(event, 'id')))
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Panduan tidak ditemukan.' })
  return { data: adminGuide(row, await getGuideTranslations(useDb(), row.id)) }
})
