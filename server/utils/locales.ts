export const DEFAULT_LOCALE = 'id' as const
export const SUPPORTED_LOCALES = ['id', 'en'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]
export function parseLocale(value: unknown): SupportedLocale {
  if (value === undefined || value === null || value === '') return DEFAULT_LOCALE
  if (typeof value !== 'string' || !SUPPORTED_LOCALES.includes(value as SupportedLocale)) throw createError({ statusCode: 400, statusMessage: 'Locale tidak didukung. Gunakan id atau en.' })
  return value as SupportedLocale
}
