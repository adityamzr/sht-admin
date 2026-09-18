import { useDb } from '~/server/db'
import { createTourExpense, getTourWorkspaceIdFinance } from '~/server/services/tour-finance'
import { tourExpenseInput } from '~/server/utils/tour-validators'
import { adminTourExpense } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, tourExpenseInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdFinance(db)
  const user = (event.context as any).adminUser
  const row = await createTourExpense(db, workspaceId, body.data, user?.id)
  return { data: adminTourExpense(row as any) }
})
