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
  if (typeof value === 'string') return value.slice(0, 10)
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const normalized = String(value).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null
}

export function addTourDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function tourDaysBetween(fromDateKey: string, toDateKey: string): number {
  const from = Date.parse(`${fromDateKey}T00:00:00.000Z`)
  const to = Date.parse(`${toDateKey}T00:00:00.000Z`)
  return Math.round((to - from) / 86_400_000)
}
