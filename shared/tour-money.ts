/**
 * Money parsing/formatting helper for Tour Operations.
 * UI: "37.500.000" <-> API: 37500000
 */

export function formatMoneyId(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value as any)) return ''
  return Number(value).toLocaleString('id-ID')
}

export function parseMoneyId(formatted: string): number | null {
  if (!formatted) return null
  const cleaned = formatted.replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.-]/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null
  const num = Number(cleaned)
  if (isNaN(num)) return null
  return num
}

export function formatMoneyWithCurrency(value: number | null | undefined, currency: string = 'IDR'): string {
  if (value === null || value === undefined) return '—'
  const formatted = formatMoneyId(value)
  if (currency === 'IDR') return `Rp ${formatted}`
  return `${currency} ${formatted}`
}
