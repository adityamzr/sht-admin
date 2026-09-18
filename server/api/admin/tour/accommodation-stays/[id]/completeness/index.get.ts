import { useDb } from '~/server/db'
import { getStayCompleteness, getTourWorkspaceIdAccommodation } from '~/server/services/tour-accommodation'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdAccommodation(db)
  const data = await getStayCompleteness(db, workspaceId, id)
  return { data }
})
