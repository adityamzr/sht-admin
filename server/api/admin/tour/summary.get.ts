import { useDb } from '~/server/db'
import { getTourWorkspaceId } from '~/server/services/tour-operations'
import { getTourOperationalDashboard } from '~/server/services/tour-dashboard'

export default defineEventHandler(async () => {
  const db = useDb()
  const workspaceId = await getTourWorkspaceId(db)
  try {
    const data = await getTourOperationalDashboard(db, workspaceId)
    return { data }
  } catch (e: any) {
    console.error('[tour/summary] failed:', e?.message, e?.stack)
    // Preserve original error for debugging but ensure message is sanitized
    throw createError({
      statusCode: e?.statusCode || 500,
      statusMessage: e?.statusMessage || e?.message || 'Gagal memuat dashboard Tour',
      data: { stack: e?.stack?.split('\n').slice(0, 10) },
    })
  }
})
