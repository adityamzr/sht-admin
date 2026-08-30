import { desc, eq } from 'drizzle-orm'
import { estimationItems, estimationRates, estimations } from '../db/schema'
import type { DbLike } from '../db'

/**
 * ESTIMATION FOUNDATION (M2): persistensi snapshot immutabel.
 * Submit flow customer (validasi → kalkulasi ulang → lead → WhatsApp)
 * diimplementasikan di M3+ — di sini hanya struktur & penyimpanan snapshot.
 */

export function estimationNumberForSequence(sequence: number): string {
  return `EST-${String(sequence).padStart(6, '0')}`
}

export interface EstimationItemSnapshot {
  category: string
  label: string
  detail?: string | null
  unit?: string | null
  unitPrice?: number | null
  currency: string
  quantity?: number | null
  amount: number
  meta?: Record<string, unknown>
  sortOrder?: number
}

export interface EstimationSnapshotInput {
  pilgrims: number
  departureCity: string
  departureDate: string
  returnDate: string
  durationDays: number
  makkahNights: number
  madinahNights: number
  items: EstimationItemSnapshot[]
  rates: Array<{ sourceCurrency: string; targetCurrency: string; rate: number }>
  totalAmount: number
  currency: string
  perPersonAmount?: number | null
}

/** Simpan snapshot estimasi (immutable). Nomor EST-xxxxx digenerate DB-side dari sequence. */
export async function createEstimation(db: DbLike, input: EstimationSnapshotInput) {
  const [estimation] = await db
    .insert(estimations)
    .values({
      pilgrims: input.pilgrims,
      departureCity: input.departureCity,
      departureDate: new Date(input.departureDate),
      returnDate: new Date(input.returnDate),
      durationDays: input.durationDays,
      makkahNights: input.makkahNights,
      madinahNights: input.madinahNights,
      totalAmount: String(input.totalAmount),
      currency: input.currency,
      perPersonAmount: input.perPersonAmount === null || input.perPersonAmount === undefined ? null : String(input.perPersonAmount),
    })
    .returning()

  if (input.items.length) {
    await db.insert(estimationItems).values(
      input.items.map((it, i) => ({
        estimationId: estimation.id,
        category: it.category,
        label: it.label,
        detail: it.detail ?? null,
        unit: it.unit ?? null,
        unitPrice: it.unitPrice === null || it.unitPrice === undefined ? null : String(it.unitPrice),
        currency: it.currency,
        quantity: it.quantity === null || it.quantity === undefined ? null : String(it.quantity),
        amount: String(it.amount),
        meta: it.meta ?? {},
        sortOrder: it.sortOrder ?? i,
      })),
    )
  }

  if (input.rates.length) {
    await db.insert(estimationRates).values(
      input.rates.map((r) => ({
        estimationId: estimation.id,
        sourceCurrency: r.sourceCurrency,
        targetCurrency: r.targetCurrency,
        rate: String(r.rate),
      })),
    )
  }

  return getEstimation(db, estimation.id)
}

export async function listEstimations(db: DbLike) {
  return db.select().from(estimations).orderBy(desc(estimations.submittedAt))
}

export async function getEstimation(db: DbLike, id: number) {
  const rows = await db.select().from(estimations).where(eq(estimations.id, id)).limit(1)
  const estimation = rows[0] ?? null
  if (!estimation) return null
  const items = await db.select().from(estimationItems).where(eq(estimationItems.estimationId, id)).orderBy(estimationItems.sortOrder)
  const rates = await db.select().from(estimationRates).where(eq(estimationRates.estimationId, id))
  return { ...estimation, items, rates }
}
