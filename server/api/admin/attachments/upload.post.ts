import { eq } from 'drizzle-orm'
import { workspaces } from '~/server/db/schema'
import { useDb } from '~/server/db'
import { requireAdminSession } from '~/server/utils/session'
import { hasWorkspaceAccess } from '~/server/services/workspace'
import { createAttachment } from '~/server/services/admin-attachments'

export default defineEventHandler(async (event) => {
  const session = requireAdminSession(event)
  const db = useDb()

  const form = await readMultipartFormData(event)
  if (!form || !form.length) {
    throw createError({ statusCode: 400, statusMessage: 'Form data tidak ditemukan' })
  }

  let filePart: any = null
  let entityType: string | null = null
  let entityId: string | null = null
  let workspaceId: string | null = null

  for (const part of form) {
    if (part.name === 'file') filePart = part
    else if (part.name === 'entityType') entityType = part.data.toString()
    else if (part.name === 'entityId') entityId = part.data.toString()
    else if (part.name === 'workspaceId') workspaceId = part.data.toString()
  }

  if (!filePart) throw createError({ statusCode: 400, statusMessage: 'File wajib diunggah' })
  if (!entityType) throw createError({ statusCode: 400, statusMessage: 'entityType wajib' })
  if (!entityId) throw createError({ statusCode: 400, statusMessage: 'entityId wajib' })
  if (!workspaceId) throw createError({ statusCode: 400, statusMessage: 'workspaceId wajib' })

  const wsId = Number(workspaceId)
  if (isNaN(wsId)) throw createError({ statusCode: 400, statusMessage: 'workspaceId tidak valid' })

  const wsRows = await db.select().from(workspaces).where(eq(workspaces.id, wsId)).limit(1)
  if (!wsRows[0]) throw createError({ statusCode: 404, statusMessage: 'Workspace tidak ditemukan' })
  const wsKey = wsRows[0].key
  if (!(await hasWorkspaceAccess(db, session.userId, wsKey))) {
    throw createError({ statusCode: 403, statusMessage: 'Akses workspace tidak diizinkan.' })
  }

  try {
    const attachment = await createAttachment(db, wsId, {
      entityType,
      entityId: Number(entityId),
      file: {
        filename: filePart.filename,
        type: filePart.type,
        data: filePart.data,
      },
      uploadedBy: session.userId,
    })
    return { data: attachment }
  } catch (e: any) {
    if (e.statusCode) throw e
    throw createError({ statusCode: 400, statusMessage: e.message || 'Gagal upload file' })
  }
})
