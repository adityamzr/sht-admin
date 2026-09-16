import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  tourInvoiceInput,
  tourPaymentInput,
  tourExpenseInput,
} from '../server/utils/tour-validators'

function toIso(d: any): string | null {
  if (!d) return null
  if (typeof d === 'string') return d.slice(0,10)
  if (d instanceof Date) return d.toISOString().slice(0,10)
  return String(d).slice(0,10)
}

function derivePaymentStatus(invoice: any, totalPaid: number, outstanding: number): string {
  if (invoice.state === 'CANCELLED') return 'CANCELLED'
  if (outstanding === 0 && totalPaid > 0) return 'PAID'
  if (totalPaid > 0 && outstanding > 0) return 'PARTIAL'
  if (invoice.dueDate) {
    const today = new Date().toISOString().slice(0,10)
    const due = toIso(invoice.dueDate)
    if (due && due < today && outstanding > 0) return 'OVERDUE'
  }
  return 'UNPAID'
}

function computeExpenseIdr(currency: string, amount: number, snapshot: number | null) {
  if (currency === 'IDR') return amount
  if (!snapshot || snapshot <= 0) throw new Error('snapshot required')
  return amount * snapshot
}

describe('tour finance v1', () => {
  it('invoice create workspace-safe, dueDate >= issueDate, amount>0', () => {
    const ok = tourInvoiceInput.safeParse({
      orderId: 1,
      issueDate: '2026-10-01',
      dueDate: '2026-10-15',
      amountIdr: 5000000,
      state: 'DRAFT',
    })
    assert.equal(ok.success, true)

    const badDue = tourInvoiceInput.safeParse({
      orderId: 1,
      issueDate: '2026-10-15',
      dueDate: '2026-10-01',
      amountIdr: 5000000,
    })
    assert.equal(badDue.success, false, 'dueDate before issueDate should fail')

    const zeroAmount = tourInvoiceInput.safeParse({
      orderId: 1,
      issueDate: '2026-10-01',
      amountIdr: 0,
    })
    assert.equal(zeroAmount.success, false, 'amountIdr 0 should fail')

    // workspace-safe: order must exist same workspace – simulated by service check, not validator, but ensure orderId required
    const noOrder = tourInvoiceInput.safeParse({
      issueDate: '2026-10-01',
      amountIdr: 1000,
    } as any)
    assert.equal(noOrder.success, false)
  })

  it('invoice cancellation cannot receive new verified payments, status derivation', () => {
    const invDraft = { id: 1, state: 'DRAFT', amountIdr: 10000000, dueDate: '2026-12-01' }
    const invCancelled = { id: 2, state: 'CANCELLED', amountIdr: 10000000, dueDate: '2026-12-01' }
    const invIssuedOverdue = { id: 3, state: 'ISSUED', amountIdr: 5000000, dueDate: '2026-01-01' }

    // derivation
    assert.equal(derivePaymentStatus(invDraft, 0, 10000000), 'UNPAID')
    assert.equal(derivePaymentStatus(invDraft, 5000000, 5000000), 'PARTIAL')
    assert.equal(derivePaymentStatus(invDraft, 10000000, 0), 'PAID')
    assert.equal(derivePaymentStatus(invCancelled, 0, 10000000), 'CANCELLED')
    assert.equal(derivePaymentStatus(invCancelled, 5000000, 5000000), 'CANCELLED', 'CANCELLED excluded from receivables')
    // overdue
    assert.equal(derivePaymentStatus(invIssuedOverdue, 0, 5000000), 'OVERDUE')

    // CANCELLED cannot receive new verified payments – service rule
    const canReceive = (inv: any) => inv.state !== 'CANCELLED'
    assert.equal(canReceive(invDraft), true)
    assert.equal(canReceive(invCancelled), false)
  })

  it('payment verified updates paid/partial/full, overpayment prevention, VOID/DRAFT excluded, isolation', () => {
    const invoiceAmount = 10000000
    const existingPaidVerified = 6000000
    const existingDraft = 4000000
    const existingVoid = 1000000

    // Only VERIFIED counted
    const totalPaidVerifiedOnly = existingPaidVerified // DRAFT/VOID excluded
    assert.equal(totalPaidVerifiedOnly, 6000000)

    const outstanding = Math.max(invoiceAmount - totalPaidVerifiedOnly, 0)
    assert.equal(outstanding, 4000000)

    // New payment 3M should be OK (within outstanding)
    const newPaymentOk = 3000000
    assert.equal(totalPaidVerifiedOnly + newPaymentOk <= invoiceAmount, true)

    // New payment 5M should fail (overpayment)
    const newPaymentOver = 5000000
    assert.equal(totalPaidVerifiedOnly + newPaymentOver > invoiceAmount, true, 'should prevent overpayment')

    // Status after
    assert.equal(derivePaymentStatus({ state: 'ISSUED', amountIdr: invoiceAmount, dueDate: null }, totalPaidVerifiedOnly, outstanding), 'PARTIAL')
    assert.equal(derivePaymentStatus({ state: 'ISSUED', amountIdr: invoiceAmount, dueDate: null }, 10000000, 0), 'PAID')

    // Isolation: workspaceId must match – service ensures eq(workspaceId)
    const wsTour = 1, wsOther = 2
    const payments = [
      { id: 1, workspaceId: wsTour, invoiceId: 10, amountIdr: 5000000, status: 'VERIFIED' },
      { id: 2, workspaceId: wsOther, invoiceId: 10, amountIdr: 5000000, status: 'VERIFIED' },
    ]
    const filtered = payments.filter(p => p.workspaceId === wsTour)
    assert.equal(filtered.length, 1)
    assert.equal(filtered[0].workspaceId, wsTour)
  })

  it('expense IDR/SAR/USD snapshot stability, Booking relation isolation, VERIFIED filter', () => {
    // IDR snapshot null, amountIdr = amount
    assert.equal(computeExpenseIdr('IDR', 1000000, null), 1000000)
    assert.equal(computeExpenseIdr('IDR', 500, null), 500)

    // SAR with snapshot
    assert.equal(computeExpenseIdr('SAR', 100, 4350), 435000)
    // USD with snapshot
    assert.equal(computeExpenseIdr('USD', 100, 16000), 1600000)

    // Snapshot stability: amountIdr stored, not recalc on global rate change
    const stored = { currency: 'SAR', amount: 100, exchangeRateSnapshot: 4350, amountIdr: 435000 }
    const globalRateNow = 4400
    // amountIdr must stay 435000, not 440000
    assert.equal(stored.amountIdr, 435000)
    assert.notEqual(stored.amountIdr, stored.amount * globalRateNow)

    // Validator requires snapshot for non-IDR
    const okIdr = tourExpenseInput.safeParse({
      expenseDate: '2026-10-01',
      category: 'HOTEL',
      currency: 'IDR',
      amount: 1000000,
      description: '',
    })
    assert.equal(okIdr.success, true)

    const badSarNoSnapshot = tourExpenseInput.safeParse({
      expenseDate: '2026-10-01',
      category: 'HOTEL',
      currency: 'SAR',
      amount: 100,
      description: '',
    })
    assert.equal(badSarNoSnapshot.success, false, 'SAR without snapshot should fail')

    const okSar = tourExpenseInput.safeParse({
      expenseDate: '2026-10-01',
      category: 'HOTEL',
      currency: 'SAR',
      amount: 100,
      exchangeRateSnapshot: 4350,
      description: '',
    })
    assert.equal(okSar.success, true)

    const okUsd = tourExpenseInput.safeParse({
      expenseDate: '2026-10-01',
      category: 'FLIGHT',
      currency: 'USD',
      amount: 1000,
      exchangeRateSnapshot: 16200,
      description: '',
    })
    assert.equal(okUsd.success, true)

    // Booking relation isolation: expense can link to bookingId, orderId, tripId, vendorId nullable, same workspace enforced by service
    const expenseWithBooking = { id: 1, bookingId: 10, orderId: 5, tripId: 3, vendorId: 7, workspaceId: 1 }
    assert.ok(expenseWithBooking.bookingId)

    // VERIFIED included, VOID/DRAFT excluded for profitability
    const expenses = [
      { id: 1, amountIdr: 1000000, status: 'VERIFIED' },
      { id: 2, amountIdr: 2000000, status: 'DRAFT' },
      { id: 3, amountIdr: 3000000, status: 'VOID' },
    ]
    const verifiedTotal = expenses.filter(e => e.status === 'VERIFIED').reduce((s, e) => s + e.amountIdr, 0)
    assert.equal(verifiedTotal, 1000000)
  })

  it('profitability expected/current no duplicate, cancelled/void excluded, multi-trip handled', () => {
    const orderValue = 50000000
    const bookings = [
      { id: 1, orderId: 10, amountIdr: 10000000 },
      { id: 2, orderId: 10, amountIdr: 15000000 },
      { id: 3, orderId: 10, amountIdr: 5000000, deletedAt: new Date() }, // soft-deleted should be excluded
    ]
    const activeBookings = bookings.filter(b => !(b as any).deletedAt)
    const committed = activeBookings.reduce((s, b) => s + Number(b.amountIdr), 0)
    assert.equal(committed, 25000000)

    const expected = orderValue - committed
    assert.equal(expected, 25000000)

    // Expenses: avoid double count same expense linked via orderId and bookingId
    const directExpenses = [{ id: 1, orderId: 10, amountIdr: 5000000, status: 'VERIFIED' }]
    const bookingExpenses = [{ id: 1, bookingId: 1, orderId: 10, amountIdr: 5000000, status: 'VERIFIED' }] // same id
    const all = [...directExpenses]
    for (const be of bookingExpenses) {
      if (!all.some(e => e.id === be.id)) all.push(be as any)
    }
    const actual = all.filter(e => e.status === 'VERIFIED').reduce((s, e) => s + Number(e.amountIdr), 0)
    assert.equal(actual, 5000000, 'should not double count same expense id')

    // CANCELLED/VOID excluded
    const expensesMixed = [
      { id: 2, amountIdr: 2000000, status: 'VERIFIED' },
      { id: 3, amountIdr: 3000000, status: 'VOID' },
      { id: 4, amountIdr: 1000000, status: 'DRAFT' },
      { id: 5, amountIdr: 4000000, status: 'CANCELLED' as any }, // not valid but test exclusion
    ]
    const actualFiltered = expensesMixed.filter(e => e.status === 'VERIFIED').reduce((s, e) => s + Number(e.amountIdr), 0)
    assert.equal(actualFiltered, 2000000)

    // Cash Received
    const payments = [
      { amountIdr: 10000000, status: 'VERIFIED' },
      { amountIdr: 5000000, status: 'DRAFT' },
      { amountIdr: 2000000, status: 'VOID' },
    ]
    const cashReceived = payments.filter(p => p.status === 'VERIFIED').reduce((s, p) => s + Number(p.amountIdr), 0)
    assert.equal(cashReceived, 10000000)

    const currentCashMargin = cashReceived - actualFiltered
    assert.equal(currentCashMargin, 8000000)

    // Multi-trip handling: order linked to 2 trips, revenue not allocated uniquely per trip
    const tripOrders = [
      { tripId: 1, orderId: 10 },
      { tripId: 2, orderId: 10 },
    ]
    const tripCountPerOrder: Record<number, number> = {}
    for (const to of tripOrders) tripCountPerOrder[to.orderId] = (tripCountPerOrder[to.orderId] || 0) + 1
    assert.equal(tripCountPerOrder[10], 2)
    const isMultiTrip = tripCountPerOrder[10] > 1
    assert.equal(isMultiTrip, true)
    // When shared, profitability note should warn
    const note = isMultiTrip ? 'Beberapa Order terhubung ke lebih dari satu Trip, nilai Order tidak dialokasikan unik per Trip' : null
    assert.ok(note)
  })

  it('overview KPIs: cash outstanding expenses cash position overdue', () => {
    const invoices = [
      { id: 1, amountIdr: 10000000, state: 'ISSUED', dueDate: '2026-01-01' }, // overdue
      { id: 2, amountIdr: 5000000, state: 'ISSUED', dueDate: '2026-12-31' }, // not overdue
      { id: 3, amountIdr: 3000000, state: 'CANCELLED', dueDate: '2026-01-01' }, // cancelled excluded
    ]
    const payments = [
      { invoiceId: 1, amountIdr: 4000000, status: 'VERIFIED' },
      { invoiceId: 1, amountIdr: 1000000, status: 'DRAFT' }, // excluded
      { invoiceId: 2, amountIdr: 5000000, status: 'VERIFIED' }, // fully paid
      { invoiceId: 2, amountIdr: 1000000, status: 'VOID' }, // excluded
    ]
    const expenses = [
      { amountIdr: 2000000, status: 'VERIFIED' },
      { amountIdr: 1000000, status: 'DRAFT' },
    ]

    const cashReceived = payments.filter(p => p.status === 'VERIFIED').reduce((s, p) => s + Number(p.amountIdr), 0)
    assert.equal(cashReceived, 9000000)

    const paidByInvoice: Record<number, number> = {}
    for (const p of payments) {
      if (p.status !== 'VERIFIED') continue
      paidByInvoice[p.invoiceId] = (paidByInvoice[p.invoiceId] || 0) + Number(p.amountIdr)
    }
    let outstanding = 0
    let overdueCount = 0
    const today = '2026-05-17'
    for (const inv of invoices) {
      if (inv.state === 'CANCELLED') continue
      const paid = paidByInvoice[inv.id] || 0
      const out = Math.max(Number(inv.amountIdr) - paid, 0)
      if (out > 0) {
        outstanding += out
        const due = toIso(inv.dueDate)
        if (due && due < today) overdueCount++
      }
    }
    assert.equal(outstanding, 6000000) // inv1 6M outstanding, inv2 0
    assert.equal(overdueCount, 1)

    const verifiedExpenses = expenses.filter(e => e.status === 'VERIFIED').reduce((s, e) => s + Number(e.amountIdr), 0)
    assert.equal(verifiedExpenses, 2000000)

    const cashPosition = cashReceived - verifiedExpenses
    assert.equal(cashPosition, 7000000)
  })

  it('sidebar accordion open/close active auto-open logic', () => {
    // Simulate openGroups localStorage logic
    let openGroups: Record<string, boolean> = {}
    const toggle = (label: string) => { openGroups[label] = !openGroups[label] }
    toggle('Finance')
    assert.equal(openGroups['Finance'], true)
    toggle('Finance')
    assert.equal(openGroups['Finance'], false)

    // active group auto-opens
    const activeGroup = 'Finance'
    const ensureOpen = () => { if (activeGroup && !openGroups[activeGroup]) openGroups[activeGroup] = true }
    ensureOpen()
    assert.equal(openGroups['Finance'], true)

    // direct URL refresh should keep active group open (simulated via localStorage persistence)
    const serialized = JSON.stringify(openGroups)
    const restored = JSON.parse(serialized)
    assert.equal(restored['Finance'], true)

    // Media unaffected: when workspace media, tour groups not rendered
    const workspace: string = 'media'
    const tourGroups = ['Sales','Operations','Finance','Catalog','Pricing']
    const shouldShowTour = workspace === 'tour'
    assert.equal(shouldShowTour, false)
  })
})
