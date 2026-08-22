/** useFetch untuk admin API — forward cookie saat SSR (halaman di-guard middleware). */
export function useAdminFetch<T>(path: string, opts: Record<string, unknown> = {}) {
  return useFetch<T>(path, {
    headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
    ...opts,
  })
}

export function adminPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  return $fetch(path, { method: 'POST', body }) as Promise<T>
}

export function adminPatch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  return $fetch(path, { method: 'PATCH', body }) as Promise<T>
}

export function adminDelete<T>(path: string): Promise<T> {
  return $fetch(path, { method: 'DELETE' }) as Promise<T>
}
