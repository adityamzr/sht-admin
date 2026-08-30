import { useDb } from '~/server/db'
import { createDepartureCity } from '~/server/services/catalog'
import { departureCityInput } from '~/server/utils/validators'
import { adminDepartureCity } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, departureCityInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const row = await createDepartureCity(useDb(), body.data)
  return { data: adminDepartureCity(row) }
})
