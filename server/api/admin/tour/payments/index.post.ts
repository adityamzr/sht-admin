import { useDb } from '~/server/db'
import { createTourPayment, getTourWorkspaceIdFinance } from '~/server/services/tour-finance'
import { tourPaymentInput } from '~/server/utils/tour-validators'
import { adminTourPayment } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, tourPaymentInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdFinance(db)
  const user = (event.context as any).adminUser
  const row = await createTourPayment(db, workspaceId, body.data, user?.id)
  return { data: adminTourPayment(row as any) }
})
