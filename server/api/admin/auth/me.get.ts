import { eq } from 'drizzle-orm'
import { adminUsers } from '~/server/db/schema'
import { useDb } from '~/server/db'
import { requireAdminSession } from '~/server/utils/session'
import { publicAdmin } from '~/server/services/auth'

export default defineEventHandler(async (event) => {
  const session = requireAdminSession(event)
  const db = useDb()
  const rows = await db.select().from(adminUsers).where(eq(adminUsers.id, session.userId)).limit(1)
  const user = rows[0]
  if (!user || !user.isActive) {
    throw createError({ statusCode: 401, statusMessage: 'Akun admin tidak aktif.' })
  }
  return { user: publicAdmin(user) }
})
