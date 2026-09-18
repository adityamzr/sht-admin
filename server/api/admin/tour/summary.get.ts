import { useDb } from '~/server/db'
import { getTourOpsSummary, getTourWorkspaceId } from '~/server/services/tour-operations'

export default defineEventHandler(async () => {
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  const summary = await getTourOpsSummary(db, workspaceId)
  return { data: summary }
})
