/** Route middleware admin: login + workspace access guard. */
export default defineNuxtRouteMiddleware(async (to) => {
  let response: { user?: unknown } | null = null
  try {
    response = await $fetch<{ user?: unknown }>('/api/admin/auth/me', {
      headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
    }).catch(() => null)
  } catch {
    response = null
  }
  if (!response?.user) return navigateTo('/login')

  const workspaceKey = to.path === '/media' || to.path.startsWith('/media/') ? 'media' : 'tour'
  const workspaces = await $fetch<{ data?: Array<{ key: string }> }>('/api/admin/workspaces', {
    headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
  }).catch(() => ({ data: [] }))
  if (!workspaces.data?.some((workspace) => workspace.key === workspaceKey)) {
    return abortNavigation(createError({ statusCode: 403, statusMessage: 'Akses workspace tidak diizinkan.' }))
  }
})
