import { getPublishedGuideBySlug } from '~/server/services/guides'
import { useDb } from '~/server/db'
import { publicGuide } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const row = await getPublishedGuideBySlug(useDb(), slug)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Panduan tidak ditemukan.' })
  return { data: publicGuide(row) }
})
