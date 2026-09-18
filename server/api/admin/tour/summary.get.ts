import { useDb } from '~/server/db'
import { getTourWorkspaceId } from '~/server/services/tour-operations'
import { getTourOperationalDashboard } from '~/server/services/tour-dashboard'

export default defineEventHandler(async () => {
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  return { data: await getTourOperationalDashboard(db, workspaceId) }
})
