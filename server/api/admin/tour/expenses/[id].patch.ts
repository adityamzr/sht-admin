import { useDb } from '~/server/db'
import { updateTourExpense, getTourWorkspaceIdFinance } from '~/server/services/tour-finance'
import { tourExpensePatch } from '~/server/utils/tour-validators'
import { adminTourExpense } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, tourExpensePatch.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdFinance(db)
  const user = (event.context as any).adminUser
  const row = await updateTourExpense(db, id, workspaceId, body.data, user?.id)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Expense tidak ditemukan' })
  return { data: adminTourExpense(row as any) }
})
