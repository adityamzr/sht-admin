import { useDb } from '~/server/db'
import { getTourJamaahEnriched, getTourWorkspaceId } from '~/server/services/tour-operations'
import { adminTourJamaah } from '~/server/utils/tour-serializers'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const row: any = await getTourJamaahEnriched(db, id, workspaceId)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Jamaah tidak ditemukan' })
  const base = adminTourJamaah(row)
  return { data: { ...base, order: row.order ?? null, customer: row.customer ?? null } }
})
