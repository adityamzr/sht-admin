/**
 * Route middleware admin: redirect ke /login bila tidak ada session.
 * Server-side: cek session langsung dari cookie request (tanpa roundtrip API).
 */
export default defineNuxtRouteMiddleware(async () => {
  let ok = false
  try {
    const data = await $fetch<{ user?: unknown }>('/api/admin/auth/me', {
      headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
    }).catch(() => null)
    ok = Boolean(data && (data as { user?: unknown }).user)
  } catch {
    ok = false
  }
  if (!ok) return navigateTo('/login')
})
