import { createError } from 'h3'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from '../../shared/locales'

export { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from '../../shared/locales'
export function parseLocale(value: unknown): SupportedLocale {
  if (value === undefined || value === null || value === '') return DEFAULT_LOCALE
  if (typeof value !== 'string' || !SUPPORTED_LOCALES.includes(value as SupportedLocale)) throw createError({ statusCode: 400, statusMessage: 'Locale tidak didukung. Gunakan id atau en.' })
  return value as SupportedLocale
}
