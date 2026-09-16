import { useDb } from '~/server/db'
import { softDeleteTourExpense, getTourWorkspaceIdFinance } from '~/server/services/tour-finance'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdFinance(db)
  const row = await softDeleteTourExpense(db, id, workspaceId)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Expense tidak ditemukan' })
  return { data: { id: row.id, deleted: true } }
})
