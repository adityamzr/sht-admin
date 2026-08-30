/** useFetch untuk admin API — forward cookie saat SSR (halaman di-guard middleware). */
import { $fetch as ofetch } from 'ofetch'

export function useAdminFetch<T>(path: string, opts: Record<string, unknown> = {}) {
  return useFetch<T>(path, {
    headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
    ...opts,
  })
}

/** Dynamic admin paths intentionally use raw ofetch to avoid Nuxt route-type recursion. */
export function adminPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  return ofetch<T>(path, { method: 'POST', body })
}

export function adminPatch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  return ofetch<T>(path, { method: 'PATCH', body })
}

export function adminDelete<T>(path: string): Promise<T> {
  return ofetch<T>(path, { method: 'DELETE' })
}
