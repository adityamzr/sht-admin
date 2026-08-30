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
  if (await guideSlugExists(db, body.data.slug, id)) throw createError({ statusCode: 409, statusMessage: 'Slug panduan sudah digunakan.' })
  const row = await updateGuide(db, id, { ...body.data, publishedAt: body.data.publishedAt ? new Date(body.data.publishedAt) : null })
  return { data: adminGuide(row!) }
})
