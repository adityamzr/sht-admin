import { useDb } from '~/server/db'
import { listAccessibleWorkspaces } from '~/server/services/workspace'
import { requireAdminSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const session = requireAdminSession(event)
  const data = await listAccessibleWorkspaces(useDb(), session.userId)
  return { data }
})
