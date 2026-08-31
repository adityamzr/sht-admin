import { and, not, sql, type SQL, type AnyColumn } from 'drizzle-orm'
import { createError } from 'h3'
import type { TranslationReadiness } from '../../shared/media-localization'

export function nonBlank(column: AnyColumn) {
  const whitespace = ' \t\n\r\f\v\u00a0\ufeff\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000'
  return sql<boolean>`coalesce(length(btrim(${column}, ${whitespace})) > 0, false)`
}
export function nonEmptyBody(column: AnyColumn) {
  return sql<boolean>`case when jsonb_typeof(${column}) = 'array' then jsonb_array_length(${column}) > 0 else false end`
}
export function readinessCondition(readiness: TranslationReadiness | undefined, complete: SQL) {
  return readiness === 'complete' ? complete : readiness === 'incomplete' ? not(complete) : undefined
}
export function parseReadiness(value: unknown): TranslationReadiness | undefined {
  if (value === undefined || value === '') return undefined
  if (value === 'complete' || value === 'incomplete') return value
  throw createError({ statusCode: 400, statusMessage: 'Filter terjemahan tidak valid.' })
}
export function translationComplete(...conditions: SQL[]) { return and(...conditions)! }
export function rethrowLocalizedWrite(error: unknown): never {
  let cause = error
  while (cause && typeof cause === 'object') {
    if ('code' in cause && cause.code === '23505') throw createError({ statusCode: 409, statusMessage: 'Slug atau terjemahan sudah digunakan.' })
    cause = 'cause' in cause ? cause.cause : undefined
  }
  throw error
}
