import { useDb } from '~/server/db'
import { createRoute } from '~/server/services/catalog'
import { routeInput } from '~/server/utils/validators'
import { adminRoute } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, routeInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const row = await createRoute(useDb(), body.data)
  return { data: adminRoute(row) }
})
