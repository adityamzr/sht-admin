/**
 * Guard global: SEMUA /api/admin/* wajib session admin valid,
 * kecuali login itu sendiri. API publik (/api/v1/*) tidak diguard.
 */
import { requireAdminSession } from '../utils/session'

export default defineEventHandler((event) => {
  const path = event.path
  if (path.startsWith('/api/admin') && !path.startsWith('/api/admin/auth/login')) {
    requireAdminSession(event)
  }
})
