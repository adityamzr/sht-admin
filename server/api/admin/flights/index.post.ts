import { useDb } from '~/server/db'
import { createFlight } from '~/server/services/catalog'
import { flightInput } from '~/server/utils/validators'
import { adminFlight } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, flightInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const row = await createFlight(useDb(), body.data)
  return { data: adminFlight(row) }
})
