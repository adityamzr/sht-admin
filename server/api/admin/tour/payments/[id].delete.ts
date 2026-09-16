import { useDb } from '~/server/db'
import { softDeleteTourPayment, getTourWorkspaceIdFinance } from '~/server/services/tour-finance'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdFinance(db)
  const row = await softDeleteTourPayment(db, id, workspaceId)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Payment tidak ditemukan' })
  return { data: { id: row.id, deleted: true } }
})
