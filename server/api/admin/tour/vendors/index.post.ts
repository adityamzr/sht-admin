import { useDb } from '~/server/db'
import { createTourVendor, getTourWorkspaceId } from '~/server/services/tour-operations'
import { tourVendorInput } from '~/server/utils/tour-validators'
import { adminTourVendor } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, tourVendorInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const row = await createTourVendor(db, workspaceId, body.data)
  return { data: adminTourVendor(row) }
})
