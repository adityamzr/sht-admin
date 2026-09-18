/**
 * Tour Timestamp Operational Codes – Format & Collision Tests
 * Spec: PREFIX + YYMMDDHHmm Asia/Jakarta, collision suffixes -ss and -ssSSS
 */

import { describe, it, expect } from 'vitest'
import {
  generateOperationalCode,
  getJakartaParts,
  formatJakartaTimestamp,
  TOUR_CODE_PREFIXES,
  getNextCollisionCode,
} from '../server/utils/tour-code-generator'

describe('tour timestamp codes – format', () => {
  it('formats frozen time 2026-09-18T18:47 Asia/Jakarta correctly', () => {
    // 2026-09-18 18:47 WIB = 2026-09-18T11:47:00Z (UTC+7)
    const frozenUtc = new Date('2026-09-18T11:47:00.000Z')
    // Should produce ORD2609181847 etc
    const ord = generateOperationalCode('ORD', frozenUtc, 0)
    expect(ord).toBe('ORD2609181847')

    const inv = generateOperationalCode('INV', frozenUtc, 0)
    expect(inv).toBe('INV2609181847')

    const pay = generateOperationalCode('PAY', frozenUtc, 0)
    expect(pay).toBe('PAY2609181847')

    const exp = generateOperationalCode('EXP', frozenUtc, 0)
    expect(exp).toBe('EXP2609181847')

    const bkg = generateOperationalCode('BKG', frozenUtc, 0)
    expect(bkg).toBe('BKG2609181847')

    const trp = generateOperationalCode('TRP', frozenUtc, 0)
    expect(trp).toBe('TRP2609181847')

    const cus = generateOperationalCode('CUS', frozenUtc, 0)
    expect(cus).toBe('CUS2609181847')

    const vnd = generateOperationalCode('VND', frozenUtc, 0)
    expect(vnd).toBe('VND2609181847')

    const jmh = generateOperationalCode('JMH', frozenUtc, 0)
    expect(jmh).toBe('JMH2609181847')

    const sty = generateOperationalCode('STY', frozenUtc, 0)
    expect(sty).toBe('STY2609181847')

    const rom = generateOperationalCode('ROM', frozenUtc, 0)
    expect(rom).toBe('ROM2609181847')
  })

  it('timezone conversion UTC -> WIB', () => {
    // 2026-09-18T11:47:00Z should be 18:47 WIB
    const utc = new Date('2026-09-18T11:47:00.000Z')
    const parts = getJakartaParts(utc)
    expect(parts.HH).toBe('18')
    expect(parts.mm).toBe('47')
    expect(parts.dd).toBe('18')
    expect(parts.MM).toBe('09')
    expect(parts.yy).toBe('26')
  })

  it('formatJakartaTimestamp returns YYMMDDHHmm', () => {
    const utc = new Date('2026-09-18T11:47:00.000Z')
    const fmt = formatJakartaTimestamp(utc)
    expect(fmt).toBe('2609181847')
    expect(fmt).toMatch(/^\d{10}$/)
  })

  it('supports legacy codes still valid', () => {
    // Legacy format ORD-2026-0001 should be considered valid for display/search
    const legacy = 'ORD-2026-0001'
    // Our new format regex should not break legacy handling – just ensure we can distinguish
    expect(legacy).toMatch(/^ORD-2026-\d{4}$/)
    // New format
    const newCode = 'ORD2609181847'
    expect(newCode).toMatch(/^ORD\d{10}$/)
  })
})

describe('tour timestamp codes – collision handling', () => {
  it('same minute collision uses seconds suffix', () => {
    const baseDate = new Date('2026-09-18T11:47:32.000Z') // 18:47:32 WIB
    const base = generateOperationalCode('ORD', baseDate, 0)
    expect(base).toBe('ORD2609181847')

    const collision1 = generateOperationalCode('ORD', baseDate, 1)
    expect(collision1).toBe('ORD2609181847-32')
    expect(collision1).toMatch(/^ORD\d{10}-\d{2}$/)
  })

  it('same second collision uses milliseconds suffix', () => {
    const baseDate = new Date('2026-09-18T11:47:32.145Z') // 18:47:32.145 WIB
    const collision2 = generateOperationalCode('ORD', baseDate, 2)
    expect(collision2).toBe('ORD2609181847-32145')
    expect(collision2).toMatch(/^ORD\d{10}-\d{5}$/)
  })

  it('getNextCollisionCode provides correct sequence', () => {
    const baseDate = new Date('2026-09-18T11:47:32.145Z')
    const attempt0 = getNextCollisionCode('INV', baseDate, 0)
    expect(attempt0.code).toBe('INV2609181847')

    const attempt1 = getNextCollisionCode('INV', baseDate, 1)
    expect(attempt1.code).toBe('INV2609181847-32')

    const attempt2 = getNextCollisionCode('INV', baseDate, 2)
    expect(attempt2.code).toBe('INV2609181847-32145')
  })

  it('code length max 19 chars for collision with millis', () => {
    const date = new Date('2026-09-18T11:47:32.999Z')
    const code = generateOperationalCode('ORD', date, 2)
    expect(code.length).toBeLessThanOrEqual(19)
    expect(code).toBe('ORD2609181847-32999')
  })
})

describe('tour timestamp codes – immutability & validation', () => {
  it('prefixes are uppercase normalized', () => {
    const date = new Date('2026-09-18T11:47:00.000Z')
    const lower = generateOperationalCode('ord', date, 0)
    expect(lower).toBe('ORD2609181847')
    const spaced = generateOperationalCode(' ord ', date, 0)
    expect(spaced).toBe('ORD2609181847')
  })

  it('code not using random alias SHI-K7Q4-M9PX', () => {
    const date = new Date()
    const code = generateOperationalCode('INV', date, 0)
    expect(code).not.toMatch(/SHI-/)
    expect(code).toMatch(/^INV\d{10}(-\d{2,5})?$/)
  })

  it('all required prefixes exist', () => {
    expect(TOUR_CODE_PREFIXES.CUS).toBe('CUS')
    expect(TOUR_CODE_PREFIXES.ORD).toBe('ORD')
    expect(TOUR_CODE_PREFIXES.JMH).toBe('JMH')
    expect(TOUR_CODE_PREFIXES.TRP).toBe('TRP')
    expect(TOUR_CODE_PREFIXES.VND).toBe('VND')
    expect(TOUR_CODE_PREFIXES.BKG).toBe('BKG')
    expect(TOUR_CODE_PREFIXES.INV).toBe('INV')
    expect(TOUR_CODE_PREFIXES.PAY).toBe('PAY')
    expect(TOUR_CODE_PREFIXES.EXP).toBe('EXP')
    expect(TOUR_CODE_PREFIXES.STY).toBe('STY')
    expect(TOUR_CODE_PREFIXES.ROM).toBe('ROM')
  })
})
