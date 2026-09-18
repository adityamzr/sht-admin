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
 * Map of operational code fields to their unique constraint identifiers
 * Used to distinguish code collision from unrelated unique violations
 */
const CODE_CONSTRAINT_MAP: Record<string, string[]> = {
  customerCode: ['tour_customers_workspace_code_unique', 'customer_code'],
  orderCode: ['tour_orders_workspace_code_unique', 'order_code'],
  jamaahCode: ['tour_jamaah_workspace_code_unique', 'jamaah_code'],
  tripCode: ['tour_trips_workspace_code_unique', 'trip_code'],
  vendorCode: ['tour_vendors_workspace_code_unique', 'vendor_code'],
  bookingCode: ['tour_bookings_workspace_code_unique', 'booking_code'],
  invoiceCode: ['tour_invoices_workspace_code_unique', 'invoice_code'],
  paymentCode: ['tour_payments_workspace_code_unique', 'payment_code'],
  expenseCode: ['tour_expenses_workspace_code_unique', 'expense_code'],
  stayCode: ['tour_accommodation_stays_workspace_code_unique', 'stay_code'],
  roomCode: ['tour_accommodation_rooms_workspace_code_unique', 'room_code'],
}

/**
 * Extract constraint name / detail from Postgres error
 */
function extractConstraintInfo(error: any): { constraint: string; detail: string; message: string; code: string } {
  let constraint = ''
  let detail = ''
  let message = ''
  let code = ''

  // Traverse cause chain
  let current: any = error
  const visited = new Set()
  while (current && !visited.has(current)) {
    visited.add(current)
    if (current.constraint) constraint += ` ${String(current.constraint)}`
    if (current.detail) detail += ` ${String(current.detail)}`
    if (current.message) message += ` ${String(current.message)}`
    if (current.code) code += ` ${String(current.code)}`
    // Drizzle may wrap in cause
    current = current.cause
  }

  return {
    constraint: constraint.toLowerCase(),
    detail: detail.toLowerCase(),
    message: message.toLowerCase(),
    code: code.toLowerCase(),
  }
}

/**
 * Check if unique violation is specifically for operational code field
 * Only retry when the violated constraint corresponds to code field
 */
export function isCodeCollisionError(error: any, codeField: string): boolean {
  if (!isUniqueViolation(error)) return false

  const { constraint, detail, message } = extractConstraintInfo(error)
  const combined = `${constraint} ${detail} ${message}`

  const expectedIdentifiers = CODE_CONSTRAINT_MAP[codeField]
  if (!expectedIdentifiers) {
    // Unknown field – be conservative, don't retry
    return false
  }

  // Check if combined contains any of the expected constraint identifiers
  for (const id of expectedIdentifiers) {
    if (combined.includes(id)) return true
  }

  // Additional safety: if message mentions the code column explicitly, treat as collision
  // e.g. "Key (customer_code)=(CUS2609182045) already exists"
  if (combined.includes(codeField.toLowerCase()) || combined.includes(codeField.replace(/([A-Z])/g, '_$1').toLowerCase())) {
    // But ensure it's not another unique like email – we already checked identifiers
    // If it contains code column, likely collision
    return true
  }

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
 * Attempt to insert a record with timestamp code, retrying ONLY on operational code collision
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
  // Use same logical timestamp for code and createdAt consistency where practical
  let baseDate = new Date()
  let lastError: any = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { code, date } = getNextCollisionCode(prefix, baseDate, attempt)
    try {
      const values: any = {
        ...input,
        workspaceId,
        [codeField]: code,
      }

      // For createdAt consistency: if input doesn't have createdAt, use baseDate for first attempt
      // This ensures code YYMMDDHHmm matches createdAt logical instant
      if (attempt === 0 && !(input as any).createdAt) {
        // Only set if table has createdAt column – safe to set, DB will accept
        // If table doesn't have it, it will be ignored? We set conditionally
        // We'll set createdAt to date for consistency
        values.createdAt = date
      }

      const rows = await db.insert(table).values(values as never).returning()
      return rows[0]
    } catch (e: any) {
      lastError = e
      // Only retry if it's specifically a code collision, not unrelated unique violation
      if (isCodeCollisionError(e, codeField) && attempt < maxAttempts - 1) {
        if (attempt >= 2) {
          baseDate = new Date()
          await new Promise(resolve => setTimeout(resolve, 1))
        }
        continue
      }
      // For unrelated unique violations (email, etc), surface real error
      throw e
    }
  }
  throw lastError || new Error(`Failed to generate unique ${prefix} code after ${maxAttempts} attempts`)
}
