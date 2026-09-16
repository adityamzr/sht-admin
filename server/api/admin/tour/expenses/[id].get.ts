import { useDb } from '~/server/db'
import { getTourExpenseEnriched, getTourWorkspaceIdFinance } from '~/server/services/tour-finance'
import { adminTourExpense } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdFinance(db)
  const row = await getTourExpenseEnriched(db, id, workspaceId)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Expense tidak ditemukan' })
  return {
    data: {
      ...adminTourExpense(row as any),
      order: (row as any).order,
      customer: (row as any).customer,
      trip: (row as any).trip,
      vendor: (row as any).vendor,
      booking: (row as any).booking,
    },
  }
})
