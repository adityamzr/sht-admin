import { useDb } from '~/server/db'
import { removeOccupant, getTourWorkspaceIdAccommodation } from '~/server/services/tour-accommodation'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const workspaceId = await getTourWorkspaceIdAccommodation(db)
  const row = await removeOccupant(db, workspaceId, id)
  return { data: row }
})
