import { useDb } from '~/server/db'
import { updateTourPayment, getTourWorkspaceIdFinance } from '~/server/services/tour-finance'
import { tourPaymentPatch } from '~/server/utils/tour-validators'
import { adminTourPayment } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, tourPaymentPatch.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdFinance(db)
  const user = (event.context as any).adminUser
  const row = await updateTourPayment(db, id, workspaceId, body.data, user?.id)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Payment tidak ditemukan' })
  return { data: adminTourPayment(row as any) }
})
