import { getGuideTranslations } from '~/server/services/guides'
import { createGuide, guideSlugExists } from '~/server/services/guides'
import { useDb } from '~/server/db'
import { guideInput } from '~/server/utils/validators'
import { adminGuide } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, guideInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input panduan tidak valid.' })
  const db = useDb()
  const row = await createGuide(db, { ...body.data, publishedAt: body.data.publishedAt ? new Date(body.data.publishedAt) : null })
  return { data: adminGuide(row, await getGuideTranslations(useDb(), row.id)) }
})
