import { and, desc, eq, inArray } from 'drizzle-orm'
import { exchangeRates, pricingPeriods, pricingRecords } from '../db/schema'
import type { DbLike } from '../db'

/**
 * PRICING FOUNDATION — primitives reusable untuk M3+.
 * Bagian pure function (tanpa DB) bisa di-test unit langsung.
 */

export type PricingStrategy = 'cost_plus_fixed' | 'cost_plus_percentage' | 'manual'
export type MarkupType = 'fixed' | 'percentage'

// ─── Pure: kalkulasi harga jual berdasarkan strategi ────────────────────────
export interface StrategyInput {
  strategy: PricingStrategy
  supplierCost: number | null
  markupType: MarkupType | null
  markupValue: number | null
  sellingPrice: number | null
}

export function calculateSellingPrice(input: StrategyInput): number {
  if (input.strategy === 'manual') {
    if (input.sellingPrice === null) throw new Error('Manual strategy membutuhkan sellingPrice')
    return roundMoney(input.sellingPrice)
  }
  if (input.supplierCost === null || input.markupValue === null) {
    throw new Error(`Strategi ${input.strategy} membutuhkan supplierCost & markupValue`)
  }
  if (input.strategy === 'cost_plus_fixed') {
    return roundMoney(input.supplierCost + input.markupValue)
  }
  if (input.strategy === 'cost_plus_percentage') {
    return roundMoney(input.supplierCost * (1 + input.markupValue / 100))
  }
  throw new Error(`Strategi tidak dikenal: ${input.strategy}`)
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Konversi ke IDR dibulatkan tanpa desimal (tampilan customer). */
export function toIdr(amount: number, rate: number): number {
  return Math.round(amount * rate)
}

/**
 * FAIL-CLOSED (M2.1): konversi ke IDR dengan kurs eksplisit.
 * - Mata uang IDR → tidak butuh kurs, kembalikan nilai normal.
 * - Non-IDR (SAR/USD/dst.) → WAJIB ada kurs aktif; bila kurs hilang,
 *   kembalikan null — TIDAK PERNAH 1:1.
 * Invariant: angka non-IDR tidak boleh direpresentasikan sebagai IDR
 * tanpa kurs eksplisit (100 SAR ≠ 100 IDR).
 * M3: submit estimasi WAJIB gagal bila komponen tidak bisa di-resolve ke IDR.
 */
export function convertToIdrOrNull(
  amount: number,
  currency: string,
  rate: number | null | undefined,
): number | null {
  if (currency === 'IDR') return roundMoney(amount)
  if (!rate || rate <= 0) return null
  return toIdr(amount, rate)
}

// ─── Pure: resolusi periode harga (highest priority wins) ───────────────────
export function resolvePricingPeriod<
  T extends { startDate: Date | string; endDate: Date | string; priority: number; isActive: boolean },
>(periods: T[], date: Date | string): T | null {
  const d = toDateOnly(date)
  let best: (typeof periods)[number] | null = null
  for (const p of periods) {
    if (!p.isActive) continue
    if (d < toDateOnly(p.startDate) || d > toDateOnly(p.endDate)) continue
    if (!best || p.priority > best.priority) best = p
  }
  return best
}

function toDateOnly(d: Date | string): number {
  const date = typeof d === 'string' ? new Date(d) : d
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

// ─── Pure: kurs ─────────────────────────────────────────────────────────────
export function convertAmount(amount: number, rate: number): number {
  return roundMoney(amount * rate)
}

export function pickActiveRate(
  rates: Array<{ sourceCurrency: string; targetCurrency: string; rate: string | number; isActive: boolean; effectiveAt: Date }>,
  from: string,
  to: string,
): { sourceCurrency: string; targetCurrency: string; rate: number; effectiveAt: Date } | null {
  let best: (typeof rates)[number] | null = null
  for (const r of rates) {
    if (r.sourceCurrency !== from || r.targetCurrency !== to || !r.isActive) continue
    if (!best || r.effectiveAt.getTime() > best.effectiveAt.getTime()) best = r
  }
  if (!best) return null
  return { ...best, rate: typeof best.rate === 'string' ? Number(best.rate) : best.rate }
}

// ─── DB: periode ────────────────────────────────────────────────────────────
export async function listPeriods(db: DbLike) {
  return db.select().from(pricingPeriods).orderBy(pricingPeriods.priority)
}

export async function getPeriod(db: DbLike, id: number) {
  const rows = await db.select().from(pricingPeriods).where(eq(pricingPeriods.id, id)).limit(1)
  return rows[0] ?? null
}

// ─── DB: kurs ───────────────────────────────────────────────────────────────
export async function listRates(db: DbLike) {
  return db
    .select()
    .from(exchangeRates)
    .orderBy(desc(exchangeRates.effectiveAt))
}

export async function getActiveRate(db: DbLike, from: string, to: string) {
  const rows = await db
    .select()
    .from(exchangeRates)
    .where(and(eq(exchangeRates.sourceCurrency, from), eq(exchangeRates.targetCurrency, to), eq(exchangeRates.isActive, true)))
    .orderBy(desc(exchangeRates.effectiveAt))
    .limit(1)
  return rows[0] ?? null
}

// ─── DB: pricing records ────────────────────────────────────────────────────
export async function listPricingRecords(db: DbLike, entityType?: string, entityId?: number) {
  const cond = []
  if (entityType) cond.push(eq(pricingRecords.entityType, entityType))
  if (entityId !== undefined) cond.push(eq(pricingRecords.entityId, entityId))
  return db.select().from(pricingRecords).where(cond.length ? and(...cond) : undefined)
}

export async function getPricingRecord(db: DbLike, id: number) {
  const rows = await db.select().from(pricingRecords).where(eq(pricingRecords.id, id)).limit(1)
  return rows[0] ?? null
}

export interface PriceRef {
  entityType: string
  entityId: number
  currency?: string
}

export interface ResolvedPrice {
  record: typeof pricingRecords.$inferSelect
  sellingPrice: number
  /** null = mata uang non-IDR tanpa kurs aktif (fail-closed, bukan 1:1) */
  sellingPriceIdr: number | null
  currency: string
  /** kurs yang dipakai untuk konversi (null bila IDR / kurs tidak ada) */
  rateUsed: number | null
}

/**
 * Resolusi harga jual untuk satu entitas pada tanggal tertentu:
 * 1) ambil pricing records aktif untuk entitas,
 * 2) filter periode aktif yang mencakup tanggal,
 * 3) periode prioritas tertinggi menang,
 * 4) kalkulasi strategi → konversi IDR via kurs aktif.
 */
export async function resolvePrice(db: DbLike, ref: PriceRef, date: Date | string): Promise<ResolvedPrice | null> {
  const records = await db
    .select()
    .from(pricingRecords)
    .where(and(eq(pricingRecords.entityType, ref.entityType), eq(pricingRecords.entityId, ref.entityId), eq(pricingRecords.isActive, true)))

  const periods = await listPeriods(db)
  const period = resolvePricingPeriod(periods, date)
  if (!period) return null

  // Deterministik: utamakan record IDR (mata uang tampilan customer);
  // non-IDR hanya dipakai bila tidak ada harga IDR.
  const inPeriod = records.filter((r) => r.periodId === period.id && (!ref.currency || r.currency === ref.currency))
  const record = inPeriod.find((r) => r.currency === 'IDR') ?? inPeriod[0] ?? null
  if (!record) return null

  const sellingPrice = calculateSellingPrice({
    strategy: record.strategy as PricingStrategy,
    supplierCost: record.supplierCost === null ? null : Number(record.supplierCost),
    markupType: record.markupType as MarkupType | null,
    markupValue: record.markupValue === null ? null : Number(record.markupValue),
    sellingPrice: record.sellingPrice === null ? null : Number(record.sellingPrice),
  })

  // Fail-closed: non-IDR tanpa kurs aktif → sellingPriceIdr = null (bukan 1:1).
  const rateRow = record.currency === 'IDR' ? null : await getActiveRate(db, record.currency, 'IDR')
  const sellingPriceIdr = convertToIdrOrNull(sellingPrice, record.currency, rateRow ? Number(rateRow.rate) : null)

  return {
    record,
    sellingPrice,
    sellingPriceIdr,
    currency: record.currency,
    rateUsed: rateRow ? Number(rateRow.rate) : null,
  }
}

/** Resolusi massal (katalog publik): Map<entityId, ResolvedPrice>. */
export async function resolvePricesForEntities(
  db: DbLike,
  entityType: string,
  entityIds: number[],
  date: Date | string,
): Promise<Map<number, ResolvedPrice>> {
  const result = new Map<number, ResolvedPrice>()
  if (!entityIds.length) return result
  const records = await db
    .select()
    .from(pricingRecords)
    .where(and(eq(pricingRecords.entityType, entityType), inArray(pricingRecords.entityId, entityIds), eq(pricingRecords.isActive, true)))
  const periods = await listPeriods(db)
  const period = resolvePricingPeriod(periods, date)
  if (!period) return result
  for (const id of entityIds) {
    // Deterministik: utamakan record IDR, baru non-IDR (fail-closed bila tanpa kurs).
    const inPeriod = records.filter((r) => r.entityId === id && r.periodId === period.id)
    const record = inPeriod.find((r) => r.currency === 'IDR') ?? inPeriod[0] ?? null
    if (!record) continue
    const sellingPrice = calculateSellingPrice({
      strategy: record.strategy as PricingStrategy,
      supplierCost: record.supplierCost === null ? null : Number(record.supplierCost),
      markupType: record.markupType as MarkupType | null,
      markupValue: record.markupValue === null ? null : Number(record.markupValue),
      sellingPrice: record.sellingPrice === null ? null : Number(record.sellingPrice),
    })
    // Fail-closed: non-IDR tanpa kurs aktif → sellingPriceIdr = null (bukan 1:1).
    const rateRow = record.currency === 'IDR' ? null : await getActiveRate(db, record.currency, 'IDR')
    const sellingPriceIdr = convertToIdrOrNull(sellingPrice, record.currency, rateRow ? Number(rateRow.rate) : null)
    result.set(id, {
      record,
      sellingPrice,
      sellingPriceIdr,
      currency: record.currency,
      rateUsed: rateRow ? Number(rateRow.rate) : null,
    })
  }
  return result
}

/** Snapshot kurs aktif yang sedang berlaku (untuk estimasi). */
export async function activeRateSnapshot(db: DbLike) {
  const rates = await listRates(db)
  const snapshot = new Map<string, number>()
  for (const r of rates) {
    if (!r.isActive) continue
    const key = `${r.sourceCurrency}:${r.targetCurrency}`
    if (!snapshot.has(key)) snapshot.set(key, Number(r.rate))
  }
  return snapshot
}
