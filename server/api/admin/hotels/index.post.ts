import { useDb } from '~/server/db'
import { createHotel } from '~/server/services/catalog'
import { hotelInput } from '~/server/utils/validators'
import { adminHotel } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, hotelInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const row = await createHotel(useDb(), body.data)
  return { data: adminHotel(row, []) }
})
