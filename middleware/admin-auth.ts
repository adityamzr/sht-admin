/** Route middleware admin: login + workspace access guard + redirect preservation. */
export default defineNuxtRouteMiddleware(async (to) => {
  // Allow public routes
  if (to.path === '/login') return

  let response: { user?: unknown } | null = null
  try {
    response = await $fetch<{ user?: unknown }>('/api/admin/auth/me', {
      headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
    }).catch(() => null)
  } catch {
    response = null
  }
  if (!response?.user) {
    const redirect = encodeURIComponent(to.fullPath)
    return navigateTo(`/login?redirect=${redirect}`)
  }

  // Neutral routes that only require auth, not specific workspace membership
  if (
    to.path === '/workspaces' ||
    to.path.startsWith('/workspaces/') ||
    to.path === '/profile' ||
    to.path.startsWith('/profile') ||
    to.path === '/notifications' ||
    to.path.startsWith('/notifications')
  ) {
    return
  }

  // Root should go to workspace hub, not force media/tour
  if (to.path === '/') {
    return navigateTo('/workspaces', { replace: true })
  }

  const workspaceKey =
    to.path === '/media' || to.path.startsWith('/media/') ? 'media' : 'tour'

  const workspaces = await $fetch<{ data?: Array<{ key: string }> }>('/api/admin/workspaces', {
    headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
  }).catch(() => ({ data: [] }))
  if (!workspaces.data?.some((workspace) => workspace.key === workspaceKey)) {
    return abortNavigation(createError({ statusCode: 403, statusMessage: 'Akses workspace tidak diizinkan.' }))
  }
})
