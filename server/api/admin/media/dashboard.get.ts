import { getMediaDashboard } from '~/server/services/media-dashboard'
import { useDb } from '~/server/db'
export default defineEventHandler(async () => ({ data: await getMediaDashboard(useDb()) }))
