import { useDb } from '~/server/db'
import { getTourInvoiceEnriched, getTourWorkspaceIdFinance } from '~/server/services/tour-finance'
import { adminTourInvoice } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdFinance(db)
  const row = await getTourInvoiceEnriched(db, id, workspaceId)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Invoice tidak ditemukan' })
  return {
    data: {
      ...adminTourInvoice(row as any),
      order: (row as any).order,
      customer: (row as any).customer,
      totalPaid: (row as any).totalPaid,
      outstanding: (row as any).outstanding,
      paymentStatus: (row as any).paymentStatus,
    },
  }
})
