import { loginSchema } from '~/server/utils/validators'
import { useDb } from '~/server/db'
import { authenticateAdmin, publicAdmin } from '~/server/services/auth'
import { setAdminSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, loginSchema.safeParse)
  if (!body.success) {
    throw createError({ statusCode: 400, statusMessage: body.error.issues[0]?.message ?? 'Input tidak valid' })
  }
  const db = useDb()
  const user = await authenticateAdmin(db, body.data.email, body.data.password)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Email atau password salah.' })
  }
  setAdminSession(event, user.id)
  return { user: publicAdmin(user) }
})
