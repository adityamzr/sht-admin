import { useDb } from '~/server/db'
import { createTourInvoice, getTourWorkspaceIdFinance } from '~/server/services/tour-finance'
import { tourInvoiceInput } from '~/server/utils/tour-validators'
import { adminTourInvoice } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, tourInvoiceInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdFinance(db)
  const user = (event.context as any).adminUser
  const row = await createTourInvoice(db, workspaceId, body.data, user?.id)
  return { data: adminTourInvoice(row as any) }
})
