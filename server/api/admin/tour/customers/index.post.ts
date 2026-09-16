import { useDb } from '~/server/db'
import { createTourCustomer, getTourWorkspaceId } from '~/server/services/tour-operations'
import { tourCustomerInput } from '~/server/utils/tour-validators'
import { adminTourCustomer } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, tourCustomerInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const row = await createTourCustomer(db, workspaceId, body.data)
  return { data: adminTourCustomer(row) }
})
