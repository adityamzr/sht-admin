import { eq } from 'drizzle-orm'
import { workspaces } from '~/server/db/schema'
import { useDb } from '~/server/db'
import { requireAdminSession } from '~/server/utils/session'
import { hasWorkspaceAccess } from '~/server/services/workspace'
import { getAttachment, getAttachmentFilePath } from '~/server/services/admin-attachments'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

export default defineEventHandler(async (event) => {
  const session = requireAdminSession(event)
  const db = useDb()
  const id = Number(getRouterParam(event, 'id'))
  const query = getQuery(event)
  const workspaceId = Number(query.workspaceId)

  if (!id || isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'ID tidak valid' })
  if (!workspaceId || isNaN(workspaceId)) throw createError({ statusCode: 400, statusMessage: 'workspaceId wajib' })

  const wsRows = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1)
  if (!wsRows[0]) throw createError({ statusCode: 404, statusMessage: 'Workspace tidak ditemukan' })
  if (!(await hasWorkspaceAccess(db, session.userId, wsRows[0].key))) {
    throw createError({ statusCode: 403, statusMessage: 'Akses workspace tidak diizinkan.' })
  }

  const attachment = await getAttachment(db, id, workspaceId)
  const fullPath = getAttachmentFilePath(attachment.storageKey)
  if (!existsSync(fullPath)) throw createError({ statusCode: 404, statusMessage: 'File tidak ditemukan di storage' })

  const buffer = await readFile(fullPath)

  setHeader(event, 'Content-Type', attachment.mimeType)
  setHeader(event, 'Content-Disposition', `inline; filename=\"${attachment.originalName}\"`)
  setHeader(event, 'Content-Length', buffer.length)
  // No cache for private files
  setHeader(event, 'Cache-Control', 'private, no-cache, no-store')

  return buffer
})
