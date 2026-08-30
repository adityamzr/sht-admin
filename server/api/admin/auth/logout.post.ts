import { clearAdminSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  clearAdminSession(event)
  return { ok: true }
})
