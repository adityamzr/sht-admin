import { getGuide, updateGuideStatus } from '~/server/services/guides'
import { useDb } from '~/server/db'
import { adminGuide } from '~/server/utils/serializers'
import { z } from 'zod'

const statusInput = z.object({ status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']) })

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, statusInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: 'Status panduan tidak valid.' })
  const row = await updateGuideStatus(useDb(), id, body.data.status)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Panduan tidak ditemukan.' })
  return { data: adminGuide(row) }
})
