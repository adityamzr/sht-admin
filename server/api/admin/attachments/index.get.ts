import { eq } from 'drizzle-orm'
import { workspaces } from '~/server/db/schema'
import { useDb } from '~/server/db'
import { requireAdminSession } from '~/server/utils/session'
import { hasWorkspaceAccess } from '~/server/services/workspace'
import { listAttachments } from '~/server/services/admin-attachments'

export default defineEventHandler(async (event) => {
  const session = requireAdminSession(event)
  const db = useDb()
  const query = getQuery(event)
  const entityType = String(query.entityType || '')
  const entityId = Number(query.entityId)
  const workspaceId = Number(query.workspaceId)

  if (!entityType) throw createError({ statusCode: 400, statusMessage: 'entityType wajib' })
  if (!entityId || isNaN(entityId)) throw createError({ statusCode: 400, statusMessage: 'entityId wajib' })
  if (!workspaceId || isNaN(workspaceId)) throw createError({ statusCode: 400, statusMessage: 'workspaceId wajib' })

  const wsRows = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1)
  if (!wsRows[0]) throw createError({ statusCode: 404, statusMessage: 'Workspace tidak ditemukan' })
  if (!(await hasWorkspaceAccess(db, session.userId, wsRows[0].key))) {
    throw createError({ statusCode: 403, statusMessage: 'Akses workspace tidak diizinkan.' })
  }

  const data = await listAttachments(db, workspaceId, entityType, entityId)
  return { data }
})
