import { useDb } from '~/server/db'
import { createTourOrder, getTourWorkspaceId, getTourCustomer } from '~/server/services/tour-operations'
import { tourOrderInput } from '~/server/utils/tour-validators'
import { adminTourOrder } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, tourOrderInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)

  // Validate customer ownership
  const customer = await getTourCustomer(db, body.data.customerId, workspaceId)
  if (!customer) throw createError({ statusCode: 400, statusMessage: 'Customer tidak ditemukan atau bukan milik workspace ini' })

  // Validate optional lead/estimation existence is handled by FK, but we can allow null
  const row = await createTourOrder(db, workspaceId, body.data)
  return { data: adminTourOrder(row) }
})
