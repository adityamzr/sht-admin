/**
 * Centralized Timestamp Operational Code Generator
 * 
 * Standard: PREFIX + YYMMDDHHmm (Asia/Jakarta timezone)
 * Collision handling:
 *   Base: ORD2609181847
 *   Level 1 (same minute): ORD2609181847-32 (ss)
 *   Level 2 (same second): ORD2609181847-32145 (ssSSS)
 * 
 * All codes are server-only, not auth tokens.
 */

export const TOUR_CODE_PREFIXES = {
  CUS: 'CUS',
  ORD: 'ORD',
  JMH: 'JMH',
  TRP: 'TRP',
  VND: 'VND',
  BKG: 'BKG',
  INV: 'INV',
  PAY: 'PAY',
  EXP: 'EXP',
  STY: 'STY',
  ROM: 'ROM',
  LED: 'LED',
} as const

export type TourCodePrefix = keyof typeof TOUR_CODE_PREFIXES

/**
 * Get Jakarta time parts from a Date
 * Uses Intl.DateTimeFormat with Asia/Jakarta timezone (UTC+7, no DST)
 */
export function getJakartaParts(date: Date): { yy: string; MM: string; dd: string; HH: string; mm: string; ss: string; SSS: string } {
  // Ensure we have a valid date
  const d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date()

  // Use Intl to get Jakarta local time parts
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  })

  const parts = formatter.formatToParts(d)
  const map: Record<string, string> = {}
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value
  }

  // Handle midnight edge case where hour might be "24"
  let HH = map.hour || '00'
  if (HH === '24') HH = '00'

  const yy = map.year || '00'
  const MM = map.month || '01'
  const dd = map.day || '01'
  const mm = map.minute || '00'
  const ss = map.second || '00'
  // Milliseconds are absolute, not timezone-dependent, but we include for collision
  const SSS = String(d.getMilliseconds()).padStart(3, '0')

  return { yy, MM, dd, HH, mm, ss, SSS }
}

/**
 * Format Jakarta timestamp as YYMMDDHHmm
 */
export function formatJakartaTimestamp(date: Date = new Date()): string {
  const { yy, MM, dd, HH, mm } = getJakartaParts(date)
  return `${yy}${MM}${dd}${HH}${mm}`
}

/**
 * Generate operational code with collision handling
 * @param prefix e.g. 'ORD', 'INV', 'CUS'
 * @param date creation date (defaults to now)
 * @param collisionLevel 0 = base, 1 = with seconds, 2 = with seconds+millis
 */
export function generateOperationalCode(prefix: string, date: Date = new Date(), collisionLevel: number = 0): string {
  const normalizedPrefix = String(prefix || '').trim().toUpperCase()
  if (!normalizedPrefix) throw new Error('Prefix required for operational code')

  const { yy, MM, dd, HH, mm, ss, SSS } = getJakartaParts(date)
  const base = `${yy}${MM}${dd}${HH}${mm}`

  if (collisionLevel === 0) {
    return `${normalizedPrefix}${base}`
  } else if (collisionLevel === 1) {
    return `${normalizedPrefix}${base}-${ss}`
  } else {
    // Level 2+: seconds + milliseconds
    return `${normalizedPrefix}${base}-${ss}${SSS}`
  }
}

/**
 * Generate base code (no collision suffix) – primary format
 */
export function generateBaseCode(prefix: string, date: Date = new Date()): string {
  return generateOperationalCode(prefix, date, 0)
}

/**
 * Check if error is a unique constraint violation (Postgres 23505)
 */
export function isUniqueViolation(error: any): boolean {
  if (!error) return false
  const message = String(error.message || error.cause?.message || '').toLowerCase()
  const code = String(error.code || error.cause?.code || '').toLowerCase()
  // Postgres unique violation code 23505, or drizzle wraps it
  if (code === '23505') return true
  if (message.includes('unique') || message.includes('duplicate') || message.includes('23505')) return true
  // Check cause chain
  if (error.cause && isUniqueViolation(error.cause)) return true
  return false
}

/**
 * Generate code with automatic collision retry logic
 * This is a helper for service layer – attempts to generate unique code
 * by increasing precision on collision.
 * 
 * The actual retry loop must be implemented in service that does DB insert,
 * because we need to attempt insert and catch unique violation.
 * This function just provides the next code to try.
 */
export function getNextCollisionCode(prefix: string, baseDate: Date, attempt: number): { code: string; date: Date } {
  if (attempt === 0) {
    return { code: generateOperationalCode(prefix, baseDate, 0), date: baseDate }
  } else if (attempt === 1) {
    // Same minute collision – use seconds
    return { code: generateOperationalCode(prefix, baseDate, 1), date: baseDate }
  } else if (attempt === 2) {
    // Same second collision – use millis
    return { code: generateOperationalCode(prefix, baseDate, 2), date: baseDate }
  } else {
    // Extremely rare – regenerate with fresh timestamp
    const fresh = new Date()
    // Add attempt to ensure uniqueness even if same millisecond
    // Use level 2 with fresh date
    return { code: generateOperationalCode(prefix, fresh, 2), date: fresh }
  }
}

/**
 * Attempt to insert a record with timestamp code, retrying on unique collision
 * @param db Drizzle db instance
 * @param table Drizzle table
 * @param codeField Field name for operational code (e.g. 'orderCode')
 * @param prefix Prefix e.g. 'ORD'
 * @param workspaceId Workspace ID
 * @param input Other input fields (without code)
 * @param maxAttempts Max retry attempts (default 5)
 */
export async function insertWithTimestampCodeRetry(
  db: any,
  table: any,
  codeField: string,
  prefix: string,
  workspaceId: number,
  input: Record<string, unknown>,
  maxAttempts: number = 5,
): Promise<any> {
  let baseDate = new Date()
  // Use input's createdAt if provided as logical creation timestamp, else now
  // For consistency, prefer same timestamp for code and createdAt
  // But we still let DB defaultNow for createdAt unless explicitly set
  let lastError: any = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { code, date } = getNextCollisionCode(prefix, baseDate, attempt)
    try {
      // For first attempt, use baseDate as logical creation time
      // For later attempts, use the date returned (which may be fresh)
      const values: any = {
        ...input,
        workspaceId,
        [codeField]: code,
      }
      // If this is first attempt and input doesn't have createdAt, we could set it to baseDate
      // But preserve existing behavior – DB defaultNow will handle
      // However for consistency, we set createdAt to date if not provided? Let's not override unless needed
      // The task says prefer generating code from same logical creation timestamp used for record
      // We'll set createdAt to date if input doesn't have it and attempt is 0
      // Actually we should NOT set createdAt manually – let DB handle, but code timestamp should be close to createdAt
      // So we keep baseDate as now for code, and DB will set createdAt to now (close enough)

      const rows = await db.insert(table).values(values as never).returning()
      return rows[0]
    } catch (e: any) {
      lastError = e
      if (isUniqueViolation(e) && attempt < maxAttempts - 1) {
        // Collision – try next level with same baseDate or fresh
        if (attempt >= 2) {
          // For attempt >=2, refresh baseDate to now for next iteration
          baseDate = new Date()
          // Small delay to ensure millisecond changes (if needed)
          await new Promise(resolve => setTimeout(resolve, 1))
        }
        continue
      }
      throw e
    }
  }
  throw lastError || new Error(`Failed to generate unique ${prefix} code after ${maxAttempts} attempts`)
}
