export const DEFAULT_LOCALE = 'id' as const
export const SUPPORTED_LOCALES = ['id', 'en'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]
