import { eq } from 'drizzle-orm'
import { workspaces } from '~/server/db/schema'
import { useDb } from '~/server/db'
import { requireAdminSession } from '~/server/utils/session'
import { hasWorkspaceAccess } from '~/server/services/workspace'
import { softDeleteAttachment, getAttachment } from '~/server/services/admin-attachments'

export default defineEventHandler(async (event) => {
  const session = requireAdminSession(event)
  const db = useDb()
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'ID tidak valid' })

  const query = getQuery(event)
  const workspaceId = query.workspaceId ? Number(query.workspaceId) : null
  if (!workspaceId) throw createError({ statusCode: 400, statusMessage: 'workspaceId wajib untuk delete' })

  const wsRows = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1)
  if (!wsRows[0]) throw createError({ statusCode: 404, statusMessage: 'Workspace tidak ditemukan' })
  if (!(await hasWorkspaceAccess(db, session.userId, wsRows[0].key))) {
    throw createError({ statusCode: 403, statusMessage: 'Akses workspace tidak diizinkan.' })
  }

  await getAttachment(db, id, workspaceId)
  const result = await softDeleteAttachment(db, id, workspaceId)
  return { data: result }
})
