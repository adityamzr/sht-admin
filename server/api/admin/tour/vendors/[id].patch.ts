import { useDb } from '~/server/db'
import { getTourVendor, updateTourVendor, getTourWorkspaceId } from '~/server/services/tour-operations'
import { tourVendorPatch } from '~/server/utils/tour-validators'
import { adminTourVendor } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, tourVendorPatch.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const existing = await getTourVendor(db, id, workspaceId)
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Vendor tidak ditemukan' })
  const row = await updateTourVendor(db, id, workspaceId, body.data)
  return { data: row ? adminTourVendor(row) : null }
})
