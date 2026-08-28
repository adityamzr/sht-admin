import { createGuide, guideSlugExists } from '~/server/services/guides'
import { useDb } from '~/server/db'
import { guideInput } from '~/server/utils/validators'
import { adminGuide } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, guideInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input panduan tidak valid.' })
  const db = useDb()
  if (await guideSlugExists(db, body.data.slug)) throw createError({ statusCode: 409, statusMessage: 'Slug panduan sudah digunakan.' })
  const row = await createGuide(db, { ...body.data, publishedAt: body.data.publishedAt ? new Date(body.data.publishedAt) : null })
  return { data: adminGuide(row) }
})
