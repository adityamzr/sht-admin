import { useDb } from '~/server/db'
import { createService } from '~/server/services/catalog'
import { serviceInput } from '~/server/utils/validators'
import { adminService } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, serviceInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const row = await createService(useDb(), body.data)
  return { data: adminService(row) }
})
