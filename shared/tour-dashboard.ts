export const TOUR_DASHBOARD_LIMITS = {
  upcomingTrips: 5,
  attention: 8,
  recentOrders: 5,
  financeActivity: 8,
} as const

export const ACTIVE_ORDER_STATUSES = ['CONFIRMED', 'IN_PROGRESS'] as const
export const UPCOMING_TRIP_STATUSES = ['PLANNED', 'CONFIRMED'] as const

export function toTourDateKey(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') {
    const s = value.slice(0, 10)
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
  }
  if (value instanceof Date) {
    try { return value.toISOString().slice(0, 10) } catch { return null }
  }
  // Handle objects that might have toISOString (e.g., Date-like from other realms)
  if (typeof value === 'object' && value !== null && typeof (value as any).toISOString === 'function') {
    try { return (value as any).toISOString().slice(0, 10) } catch { /* fallthrough */ }
  }
  const normalized = String(value).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null
}

export function addTourDays(dateKey: string, days: number): string {
  try {
    const date = new Date(`${dateKey}T00:00:00.000Z`)
    if (isNaN(date.getTime())) return dateKey
    date.setUTCDate(date.getUTCDate() + days)
    return date.toISOString().slice(0, 10)
  } catch {
    return dateKey
  }
}

export function tourDaysBetween(fromDateKey: string, toDateKey: string): number {
  try {
    const from = Date.parse(`${fromDateKey}T00:00:00.000Z`)
    const to = Date.parse(`${toDateKey}T00:00:00.000Z`)
    if (isNaN(from) || isNaN(to)) return 0
    return Math.round((to - from) / 86_400_000)
  } catch {
    return 0
  }
}
