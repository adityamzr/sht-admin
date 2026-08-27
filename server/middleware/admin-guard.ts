/**
 * Guard global: semua /api/admin/* wajib session admin valid.
 * Existing root admin APIs adalah Tour APIs, sehingga juga memerlukan
 * membership workspace Tour. Workspace endpoint sendiri hanya membaca
 * workspace yang dapat diakses user.
 */
import { requireAdminSession } from '../utils/session'
import { requireWorkspaceAccess } from '../services/workspace'
import { useDb } from '../db'

export default defineEventHandler(async (event) => {
  const path = event.path
  if (!path.startsWith('/api/admin') || path.startsWith('/api/admin/auth/login')) return

  const session = requireAdminSession(event)
  if (path.startsWith('/api/admin/auth/logout') || path.startsWith('/api/admin/auth/me') || path.startsWith('/api/admin/workspaces')) return

  await requireWorkspaceAccess(useDb(), session.userId, 'tour')
})
