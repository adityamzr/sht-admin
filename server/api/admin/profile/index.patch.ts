import { eq } from 'drizzle-orm'
import { adminUsers } from '~/server/db/schema'
import { useDb } from '~/server/db'
import { requireAdminSession } from '~/server/utils/session'
import { profileInput } from '~/server/utils/validators'
import { deleteImageKitFile } from '~/server/services/imagekit'

export default defineEventHandler(async (event) => {
  const session = requireAdminSession(event)
  const body = await readValidatedBody(event, profileInput.safeParse)
  if (!body.success) throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message || 'Profil tidak valid.' })
  const db = useDb()
  const old = (await db.select().from(adminUsers).where(eq(adminUsers.id, session.userId)).limit(1))[0]
  const rows = await db.update(adminUsers).set({ ...body.data, updatedAt: new Date() }).where(eq(adminUsers.id, session.userId)).returning()
  if (old?.avatarFileId && old.avatarFileId !== body.data.avatarFileId) {
    try { await deleteImageKitFile(old.avatarFileId) } catch (error) { console.warn('[profile] old avatar cleanup failed', { error }) }
  }
  return { data: rows[0] }
})
