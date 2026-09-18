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
  if (
    path.startsWith('/api/admin/auth/logout') ||
    path.startsWith('/api/admin/auth/me') ||
    path.startsWith('/api/admin/workspaces') ||
    path.startsWith('/api/admin/attachments')
  ) {
    // Attachments have their own workspace authorization inside service
    // Workspaces endpoint is allowed for any authenticated user
    if (path.startsWith('/api/admin/workspaces') || path.startsWith('/api/admin/attachments')) {
      // Store user in context for downstream handlers
      ;(event.context as any).adminUser = { id: session.userId }
      return
    }
    return
  }

  // Set adminUser in context for services that need uploadedBy
  ;(event.context as any).adminUser = { id: session.userId }

  await requireWorkspaceAccess(useDb(), session.userId, path.startsWith('/api/admin/media/') ? 'media' : 'tour')
})
