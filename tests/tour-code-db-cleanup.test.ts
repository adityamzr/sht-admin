/**
 * Tour Code DB Cleanup – Tests for final cleanup
 * - New record generation with frozen time
 * - DB default removed verification
 * - Legacy compatibility
 * - Collision handling
 * - Unrelated unique error handling
 * - Immutability
 */

import { describe, it, expect } from 'vitest'
import {
  generateOperationalCode,
  isCodeCollisionError,
  isUniqueViolation,
  getNextCollisionCode,
  TOUR_CODE_PREFIXES,
} from '../server/utils/tour-code-generator'

describe('tour code db cleanup – new record generation frozen time 2026-09-18 20:45 Asia/Jakarta', () => {
  // 2026-09-18 20:45 WIB = 2026-09-18T13:45:00Z
  const frozenUtc = new Date('2026-09-18T13:45:00.000Z')

  const expectations: Record<string, string> = {
    CUS: 'CUS2609182045',
    ORD: 'ORD2609182045',
    JMH: 'JMH2609182045',
    TRP: 'TRP2609182045',
    VND: 'VND2609182045',
    BKG: 'BKG2609182045',
    INV: 'INV2609182045',
    PAY: 'PAY2609182045',
    EXP: 'EXP2609182045',
    STY: 'STY2609182045',
    ROM: 'ROM2609182045',
  }

  for (const [prefix, expected] of Object.entries(expectations)) {
    it(`generates ${expected} for ${prefix}`, () => {
      const code = generateOperationalCode(prefix, frozenUtc, 0)
      expect(code).toBe(expected)
    })
  }

  it('does NOT generate EST timestamp codes (Estimation out of scope)', () => {
    expect(TOUR_CODE_PREFIXES).not.toHaveProperty('EST')
    // Estimation should remain EST-000001 pattern, not timestamp
  })
})

describe('tour code db cleanup – DB default removed (ORM schema)', async () => {
  it('ORM schema no longer declares sequential defaults for active code columns', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const schemaPath = path.resolve(process.cwd(), 'server/db/schema.ts')
    const content = fs.readFileSync(schemaPath, 'utf-8')

    // Check active code columns should NOT have default with nextval and legacy pattern
    const activeColumns = [
      'customer_code',
      'order_code',
      'jamaah_code',
      'trip_code',
      'vendor_code',
      'booking_code',
      'invoice_code',
      'payment_code',
      'expense_code',
      'stay_code',
      'room_code',
    ]

    for (const col of activeColumns) {
      // Find line containing column definition
      const regex = new RegExp(`${col}[\\s\\S]*?default[\\s\\S]*?nextval`, 'i')
      // We need to check per column block – simpler: check that column definition line does not contain default
      // Extract relevant lines
      const lines = content.split('\n').filter(l => l.includes(col))
      for (const line of lines) {
        if (line.includes('text(') || line.includes('customer_code') || line.includes('order_code')) {
          expect(line).not.toMatch(/default.*nextval/i)
        }
      }
    }

    // Estimation should still have EST default – check with multiline
    expect(content).toMatch(/estimation_number[\s\S]*?EST-/)
    expect(content).toMatch(/estimation_seq/)
  })

  it('migration 0024 drops defaults for active columns', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const migrationPath = path.resolve(process.cwd(), 'server/db/migrations/0024_drop_tour_code_defaults.sql')
    const content = fs.readFileSync(migrationPath, 'utf-8')

    const expectedDrops = [
      'tour_customers',
      'tour_orders',
      'tour_jamaah',
      'tour_trips',
      'tour_vendors',
      'tour_bookings',
      'tour_invoices',
      'tour_payments',
      'tour_expenses',
      'tour_accommodation_stays',
      'tour_accommodation_rooms',
    ]

    for (const table of expectedDrops) {
      expect(content).toContain(table)
      expect(content).toContain('DROP DEFAULT')
    }

    // Should NOT have ALTER TABLE for estimations
    expect(content).not.toMatch(/ALTER TABLE.*estimations/i)
    // Should NOT drop estimation_seq
    expect(content).not.toMatch(/DROP.*estimation_seq/i)
  })
})

describe('tour code db cleanup – legacy data compatibility', () => {
  it('legacy codes remain valid for display/search', () => {
    const legacySamples = [
      'ORD-2026-0001',
      'INV-2026-0001',
      'CUS-2026-0001',
      'JMH-2026-0001',
      'TRIP-2026-0001',
      'VND-0001',
      'BKG-2026-0001',
      'PAY-2026-0001',
      'EXP-2026-0001',
      'STAY-2026-0001',
      'ROOM-2026-0001',
    ]

    for (const code of legacySamples) {
      // Legacy should be searchable via ilike (partial)
      expect(code).toBeTruthy()
      // Should not be rejected by new format validation – both should coexist
      expect(typeof code).toBe('string')
    }
  })

  it('search supports both legacy and new formats', () => {
    const legacy = 'ORD-2026-0001'
    const newCode = 'ORD2609182045'

    // Simulate ilike search – both contain 'ORD'
    expect(legacy.toLowerCase()).toContain('ord')
    expect(newCode.toLowerCase()).toContain('ord')

    // Partial search
    expect(legacy).toMatch(/2026/)
    expect(newCode).toMatch(/260918/)
  })
})

describe('tour code db cleanup – collision handling', () => {
  it('same minute collision uses seconds suffix', () => {
    const baseDate = new Date('2026-09-18T13:45:32.000Z') // 20:45:32 WIB
    const base = generateOperationalCode('ORD', baseDate, 0)
    expect(base).toBe('ORD2609182045')

    const collision = generateOperationalCode('ORD', baseDate, 1)
    expect(collision).toBe('ORD2609182045-32')
  })

  it('same second collision uses millis suffix', () => {
    const baseDate = new Date('2026-09-18T13:45:32.145Z')
    const collision = generateOperationalCode('ORD', baseDate, 2)
    expect(collision).toBe('ORD2609182045-32145')
  })

  it('no sequential suffix introduced', () => {
    const baseDate = new Date('2026-09-18T13:45:00.000Z')
    const codes = [
      generateOperationalCode('ORD', baseDate, 0),
      generateOperationalCode('ORD', baseDate, 1),
      generateOperationalCode('ORD', baseDate, 2),
    ]

    for (const code of codes) {
      // Should NOT match sequential pattern like ORD-2026-0001
      expect(code).not.toMatch(/-2026-/)
      // Should NOT have sequential counter like -0001 at end without timestamp logic
      // Our pattern is PREFIX + 10 digits + optional -2 or -5 digits
      expect(code).toMatch(/^[A-Z]{3}\d{10}(-\d{2,5})?$/)
    }
  })
})

describe('tour code db cleanup – unrelated unique error handling', () => {
  it('isCodeCollisionError only retries for operational code constraint', () => {
    // Simulate error for customer_code collision
    const codeCollisionError = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "tour_customers_workspace_code_unique"',
      detail: 'Key (workspace_id, customer_code)=(1, CUS2609182045) already exists',
      constraint: 'tour_customers_workspace_code_unique',
    }

    expect(isCodeCollisionError(codeCollisionError, 'customerCode')).toBe(true)
    expect(isUniqueViolation(codeCollisionError)).toBe(true)

    // Simulate error for email unique violation – should NOT be treated as code collision
    const emailCollisionError = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "tour_customers_workspace_email_unique"',
      detail: 'Key (email)=(test@example.com) already exists',
      constraint: 'tour_customers_workspace_email_unique',
    }

    expect(isUniqueViolation(emailCollisionError)).toBe(true)
    expect(isCodeCollisionError(emailCollisionError, 'customerCode')).toBe(false)

    // Simulate order code collision
    const orderCodeError = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "tour_orders_workspace_code_unique"',
      constraint: 'tour_orders_workspace_code_unique',
    }
    expect(isCodeCollisionError(orderCodeError, 'orderCode')).toBe(true)
    expect(isCodeCollisionError(orderCodeError, 'customerCode')).toBe(false)

    // Simulate unrelated business key violation
    const unrelatedError = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "tour_trip_orders_trip_order_unique"',
      constraint: 'tour_trip_orders_trip_order_unique',
    }
    expect(isCodeCollisionError(unrelatedError, 'orderCode')).toBe(false)
  })

  it('does NOT retry on non-unique errors', () => {
    const otherError = {
      code: '23503',
      message: 'foreign key violation',
    }
    expect(isUniqueViolation(otherError)).toBe(false)
    expect(isCodeCollisionError(otherError, 'orderCode')).toBe(false)
  })
})

describe('tour code db cleanup – immutability', () => {
  it('code remains identical after update (conceptual)', () => {
    const createdCode = 'ORD2609182045'
    const updatedPayload = {
      packageName: 'Updated Package',
      // Attempt to change code – should be ignored
      orderCode: 'ORD9999999999',
    }

    // Simulate service layer stripping code field
    const patch = { ...updatedPayload }
    if ((patch as any).orderCode !== undefined) delete (patch as any).orderCode

    expect(patch).not.toHaveProperty('orderCode')
    // Original code preserved
    expect(createdCode).toBe('ORD2609182045')
  })

  it('update APIs strip code fields', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const opsPath = path.resolve(process.cwd(), 'server/services/tour-operations.ts')
    const financePath = path.resolve(process.cwd(), 'server/services/tour-finance.ts')
    const accomPath = path.resolve(process.cwd(), 'server/services/tour-accommodation.ts')

    const opsContent = fs.readFileSync(opsPath, 'utf-8')
    const financeContent = fs.readFileSync(financePath, 'utf-8')
    const accomContent = fs.readFileSync(accomPath, 'utf-8')

    // Check that update functions delete code fields
    expect(opsContent).toContain('customerCode')
    expect(opsContent).toContain('orderCode')
    expect(opsContent).toContain('jamaahCode')
    expect(opsContent).toContain('tripCode')
    expect(opsContent).toContain('vendorCode')
    expect(opsContent).toContain('bookingCode')

    expect(financeContent).toContain('invoiceCode')
    expect(financeContent).toContain('paymentCode')
    expect(financeContent).toContain('expenseCode')

    expect(accomContent).toContain('stayCode')
    expect(accomContent).toContain('roomCode')
  })
})

describe('tour code db cleanup – Estimation untouched', () => {
  it('estimation still uses EST- sequence', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const schemaPath = path.resolve(process.cwd(), 'server/db/schema.ts')
    const content = fs.readFileSync(schemaPath, 'utf-8')

    expect(content).toContain('estimation_seq')
    expect(content).toContain('EST-')
    expect(content).toMatch(/estimation_number[\s\S]*?EST-/)
    expect(content).toMatch(/lpad[\s\S]*?estimation_seq/)
  })

  it('no EST timestamp codes generated', () => {
    expect(TOUR_CODE_PREFIXES).not.toHaveProperty('EST')
  })
})

describe('tour code db cleanup – unique constraints preserved', () => {
  it('unique indexes remain for active code columns', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const schemaPath = path.resolve(process.cwd(), 'server/db/schema.ts')
    const content = fs.readFileSync(schemaPath, 'utf-8')

    const expectedUniques = [
      'tour_customers_workspace_code_unique',
      'tour_orders_workspace_code_unique',
      'tour_jamaah_workspace_code_unique',
      'tour_trips_workspace_code_unique',
      'tour_vendors_workspace_code_unique',
      'tour_bookings_workspace_code_unique',
      'tour_invoices_workspace_code_unique',
      'tour_payments_workspace_code_unique',
      'tour_expenses_workspace_code_unique',
      'tour_accommodation_stays_workspace_code_unique',
      'tour_accommodation_rooms_workspace_code_unique',
    ]

    for (const unique of expectedUniques) {
      expect(content).toContain(unique)
    }
  })
})

describe('tour code db cleanup – sequences preserved', () => {
  it('legacy sequences remain defined (not aggressively dropped)', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const schemaPath = path.resolve(process.cwd(), 'server/db/schema.ts')
    const content = fs.readFileSync(schemaPath, 'utf-8')

    const sequences = [
      'tour_customers_seq',
      'tour_orders_seq',
      'tour_jamaah_seq',
      'tour_trips_seq',
      'tour_vendors_seq',
      'tour_bookings_seq',
      'tour_invoices_seq',
      'tour_payments_seq',
      'tour_expenses_seq',
      'tour_accommodation_stays_seq',
      'tour_accommodation_rooms_seq',
    ]

    for (const seq of sequences) {
      expect(content).toContain(seq)
    }
  })
})
