import { useDb } from '~/server/db'
import { createVehicle } from '~/server/services/catalog'
import { vehicleInput } from '~/server/utils/validators'
import { adminVehicle } from '~/server/utils/serializers'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, vehicleInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const row = await createVehicle(useDb(), body.data)
  return { data: adminVehicle(row) }
})
