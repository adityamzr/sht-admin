import { getGuideTranslations } from '~/server/services/guides'
import { getGuide, guideSlugExists, updateGuide } from '~/server/services/guides'
import { useDb } from '~/server/db'
import { guideInput } from '~/server/utils/validators'
import { adminGuide } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, guideInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input panduan tidak valid.' })
  const db = useDb()
  const existing = await getGuide(db, id)
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Panduan tidak ditemukan.' })
  const row = await updateGuide(db, id, { ...body.data, publishedAt: body.data.publishedAt ? new Date(body.data.publishedAt) : null })
  return { data: adminGuide(row!, await getGuideTranslations(useDb(), row!.id)) }
})
