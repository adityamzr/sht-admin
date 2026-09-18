import { useDb } from '~/server/db'
import { getTourPaymentEnriched, getTourWorkspaceIdFinance } from '~/server/services/tour-finance'
import { adminTourPayment } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdFinance(db)
  const row = await getTourPaymentEnriched(db, id, workspaceId)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Payment tidak ditemukan' })
  return {
    data: {
      ...adminTourPayment(row as any),
      invoice: (row as any).invoice,
      order: (row as any).order,
      customer: (row as any).customer,
    },
  }
})
