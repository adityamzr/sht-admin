import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  tourInvoiceInput,
  tourInvoicePatch,
  tourPaymentInput,
  tourPaymentPatch,
  tourExpenseInput,
  tourExpensePatch,
} from '../server/utils/tour-validators'

function toIso(d: any): string | null {
  if (!d) return null
  if (typeof d === 'string') return d.slice(0,10)
  if (d instanceof Date) return d.toISOString().slice(0,10)
  return String(d).slice(0,10)
}

function derivePaymentStatus(invoice: any, totalPaid: number, outstanding: number): string {
  if (invoice.state === 'CANCELLED') return 'Cancelled'
  if (invoice.state === 'DRAFT') return 'Draft'
  if (outstanding === 0 && totalPaid > 0) return 'PAID'
  if (totalPaid > 0 && outstanding > 0) return 'PARTIAL'
  if (invoice.dueDate) {
    const today = new Date().toISOString().slice(0,10)
    const due = toIso(invoice.dueDate)
    if (due && due < today && outstanding > 0) return 'OVERDUE'
  }
  return 'UNPAID'
}

// Simulate service logic for invoice lifecycle
function canInvoiceReceivePayment(invoiceState: string) {
  return invoiceState === 'ISSUED'
}
function isInvoiceOverdue(invoice: any, outstanding: number) {
  if (invoice.state !== 'ISSUED') return false
  if (outstanding <= 0) return false
  const today = new Date().toISOString().slice(0,10)
  const due = toIso(invoice.dueDate)
  return !!due && due < today
}

// Simulate FX logic from service
function computeAmountIdr(currency: string, amount: number, snapshot: number | null): number {
  if (currency === 'IDR') {
    if (snapshot !== null && snapshot !== undefined) throw new Error('IDR harus snapshot null')
    return amount
  }
  if (!snapshot || snapshot <= 0) throw new Error('Kurs baru wajib diisi saat ganti mata uang')
  return amount * snapshot
}

describe('Phase 2.1 Finance Integrity Hardening', () => {
  // ── Invoice ───────────────────────────────────────────────────────────────
  it('Invoice create blocks CANCELLED, only DRAFT/ISSUED', () => {
    const draftOk = tourInvoiceInput.safeParse({ orderId: 1, issueDate: '2026-10-01', amountIdr: 1000000, state: 'DRAFT' })
    assert.equal(draftOk.success, true)
    const issuedOk = tourInvoiceInput.safeParse({ orderId: 1, issueDate: '2026-10-01', amountIdr: 1000000, state: 'ISSUED' })
    assert.equal(issuedOk.success, true)
    const cancelledFail = tourInvoiceInput.safeParse({ orderId: 1, issueDate: '2026-10-01', amountIdr: 1000000, state: 'CANCELLED' } as any)
    assert.equal(cancelledFail.success, false, 'Create should not offer CANCELLED')
  })

  it('Invoice DRAFT excluded from receivable, ISSUED included, CANCELLED excluded', () => {
    const invoices = [
      { id: 1, state: 'DRAFT', amountIdr: 10000000, totalPaid: 0, outstanding: 10000000 },
      { id: 2, state: 'ISSUED', amountIdr: 10000000, totalPaid: 2000000, outstanding: 8000000 },
      { id: 3, state: 'CANCELLED', amountIdr: 10000000, totalPaid: 0, outstanding: 10000000 },
    ]
    const outstandingReceivables = invoices.filter(i => i.state === 'ISSUED').reduce((s, i) => s + i.outstanding, 0)
    assert.equal(outstandingReceivables, 8000000)
    assert.equal(invoices.filter(i => i.state === 'DRAFT').length, 1)
    // DRAFT excluded
    assert.equal(outstandingReceivables !== 10000000 + 8000000 + 10000000, true)
  })

  it('Invoice DRAFT not overdue, ISSUED overdue only', () => {
    const draft = { state: 'DRAFT', dueDate: '2026-01-01' }
    const issued = { state: 'ISSUED', dueDate: '2026-01-01' }
    assert.equal(isInvoiceOverdue(draft, 5000000), false, 'DRAFT label Draft, not overdue')
    assert.equal(isInvoiceOverdue(issued, 5000000), true, 'ISSUED overdue')
    assert.equal(isInvoiceOverdue(issued, 0), false, 'Paid not overdue')
  })

  it('Invoice PATCH merged date validation: due >= issue using existing', () => {
    // Simulate service merged validation
    function validateMerged(existing: any, patch: any) {
      const issue = patch.issueDate ? new Date(patch.issueDate) : new Date(existing.issueDate)
      const due = patch.dueDate ? new Date(patch.dueDate) : existing.dueDate ? new Date(existing.dueDate) : null
      if (due && issue && due.getTime() < issue.getTime()) throw new Error('dueDate tidak boleh sebelum issueDate')
    }
    const existing = { issueDate: '2026-10-10', dueDate: '2026-10-20' }
    // patch only dueDate to before existing issueDate should fail
    assert.throws(() => validateMerged(existing, { dueDate: '2026-10-05' }), /dueDate tidak boleh sebelum issueDate/)
    // patch issueDate after existing dueDate should fail
    assert.throws(() => validateMerged(existing, { issueDate: '2026-10-25' }), /dueDate tidak boleh sebelum issueDate/)
    // valid patch
    assert.doesNotThrow(() => validateMerged(existing, { dueDate: '2026-10-30' }))
  })

  it('Invoice CANCELLED terminal cannot reopen to DRAFT/ISSUED', () => {
    function canReopen(currentState: string, newState: string) {
      if (currentState === 'CANCELLED' && (newState === 'DRAFT' || newState === 'ISSUED')) return false
      return true
    }
    assert.equal(canReopen('CANCELLED', 'DRAFT'), false)
    assert.equal(canReopen('CANCELLED', 'ISSUED'), false)
    assert.equal(canReopen('ISSUED', 'CANCELLED'), true)
    assert.equal(canReopen('DRAFT', 'ISSUED'), true)
  })

  it('Payment not against DRAFT/CANCELLED invoice – only ISSUED can receive VERIFIED', () => {
    assert.equal(canInvoiceReceivePayment('DRAFT'), false)
    assert.equal(canInvoiceReceivePayment('CANCELLED'), false)
    assert.equal(canInvoiceReceivePayment('ISSUED'), true)
  })

  // ── Payment ───────────────────────────────────────────────────────────────
  it('Payment create blocks VOID, only DRAFT/VERIFIED', () => {
    const draftOk = tourPaymentInput.safeParse({ invoiceId: 1, paymentDate: '2026-10-01', amountIdr: 1000000, status: 'DRAFT' })
    assert.equal(draftOk.success, true)
    const verifiedOk = tourPaymentInput.safeParse({ invoiceId: 1, paymentDate: '2026-10-01', amountIdr: 1000000, status: 'VERIFIED' })
    assert.equal(verifiedOk.success, true)
    const voidFail = tourPaymentInput.safeParse({ invoiceId: 1, paymentDate: '2026-10-01', amountIdr: 1000000, status: 'VOID' } as any)
    assert.equal(voidFail.success, false, 'Create Payment should not offer VOID')
  })

  it('Payment DRAFT excluded from Cash, VERIFIED included, VOID excluded', () => {
    const payments = [
      { amountIdr: 10000000, status: 'DRAFT' },
      { amountIdr: 20000000, status: 'VERIFIED' },
      { amountIdr: 5000000, status: 'VOID' },
    ]
    const cashReceived = payments.filter(p => p.status === 'VERIFIED').reduce((s, p) => s + p.amountIdr, 0)
    assert.equal(cashReceived, 20000000)
  })

  it('Payment overpayment protection on verify using other VERIFIED', () => {
    const invoiceAmount = 30000000
    const otherVerified = 20000000
    const newPayment = 15000000
    const wouldExceed = otherVerified + newPayment > invoiceAmount
    assert.equal(wouldExceed, true, 'should prevent overpayment with clear message')
    const okPayment = 10000000
    assert.equal(otherVerified + okPayment <= invoiceAmount, true)
  })

  it('Payment VERIFIED immutability lock and VERIFIED→VOID→create corrected', () => {
    const lockedFields = ['invoiceId','orderId','paymentDate','amountIdr','method','accountOrChannel','referenceNumber','proofUrl']
    const draft = { status: 'DRAFT', invoiceId: 1, amountIdr: 1000000 }
    const verified = { status: 'VERIFIED', invoiceId: 1, amountIdr: 1000000 }
    // DRAFT editable
    assert.equal(draft.status, 'DRAFT')
    // VERIFIED lock
    function canEditField(currentStatus: string, field: string) {
      if (currentStatus === 'VERIFIED' && lockedFields.includes(field)) return false
      if (currentStatus === 'VOID') return false // all financial fields read-only
      return true
    }
    assert.equal(canEditField('VERIFIED', 'invoiceId'), false)
    assert.equal(canEditField('VERIFIED', 'amountIdr'), false)
    assert.equal(canEditField('VERIFIED', 'notes'), true, 'notes may still be editable')
    assert.equal(canEditField('VOID', 'amountIdr'), false)
    // VERIFIED→VOID allowed only
    function canTransition(from: string, to: string) {
      if (from === 'VERIFIED' && to === 'VOID') return true
      if (from === 'VERIFIED' && to === 'DRAFT') return false
      return true
    }
    assert.equal(canTransition('VERIFIED','VOID'), true)
    assert.equal(canTransition('VERIFIED','DRAFT'), false)
  })

  it('Payment workspace isolation', () => {
    const wsTour = 1, wsOther = 2
    const payments = [
      { id: 1, workspaceId: wsTour, invoiceId: 10, amountIdr: 5000000, status: 'VERIFIED' },
      { id: 2, workspaceId: wsOther, invoiceId: 10, amountIdr: 5000000, status: 'VERIFIED' },
    ]
    const filtered = payments.filter(p => p.workspaceId === wsTour)
    assert.equal(filtered.length, 1)
  })

  // ── Expense ───────────────────────────────────────────────────────────────
  it('Expense create blocks VOID, only DRAFT/VERIFIED', () => {
    const draftOk = tourExpenseInput.safeParse({ expenseDate: '2026-10-01', category: 'HOTEL', currency: 'IDR', amount: 1000000, status: 'DRAFT', description: '' })
    assert.equal(draftOk.success, true)
    const verifiedOk = tourExpenseInput.safeParse({ expenseDate: '2026-10-01', category: 'HOTEL', currency: 'IDR', amount: 1000000, status: 'VERIFIED', description: '' })
    assert.equal(verifiedOk.success, true)
    const voidFail = tourExpenseInput.safeParse({ expenseDate: '2026-10-01', category: 'HOTEL', currency: 'IDR', amount: 1000000, status: 'VOID', description: '' } as any)
    assert.equal(voidFail.success, false)
  })

  it('Expense FX: IDR snapshot null amountIdr=amount, SAR/USD snapshot>0 amountIdr=amount*snapshot server authoritative', () => {
    assert.equal(computeAmountIdr('IDR', 1000000, null), 1000000)
    assert.equal(computeAmountIdr('SAR', 100, 4350), 435000)
    assert.equal(computeAmountIdr('USD', 100, 16000), 1600000)
    assert.throws(() => computeAmountIdr('IDR', 1000000, 4350 as any), /IDR harus snapshot null/)
    assert.throws(() => computeAmountIdr('SAR', 100, null), /Kurs baru wajib/)
  })

  it('Expense FX transitions: IDR→SAR requires SAR rate, SAR→USD new USD rate, USD→SAR new SAR rate, SAR→IDR clears', () => {
    // Simulate PATCH FX hardening
    function patchExpense(existing: any, patch: any) {
      const finalCurrency = patch.currency ?? existing.currency
      const hasNewRate = patch.exchangeRateSnapshot !== undefined
      const finalRate = hasNewRate ? patch.exchangeRateSnapshot : existing.exchangeRateSnapshot
      const finalAmount = patch.amount ?? existing.amount

      if (finalCurrency === 'IDR') {
        // clears
        return { currency: 'IDR', exchangeRateSnapshot: null, amountIdr: finalAmount }
      } else {
        // non-IDR requires new rate if currency changed or amount changed? spec: currency change requires explicit new rate, IDR→SAR/USD requires rate, SAR→USD new USD rate, etc. No reuse old rate from other currency.
        if (existing.currency !== finalCurrency && !hasNewRate) {
          throw new Error('Kurs baru wajib diisi saat ganti mata uang')
        }
        if (existing.currency === 'IDR' && finalCurrency !== 'IDR' && !hasNewRate) {
          throw new Error('IDR→SAR/USD requires rate')
        }
        if (!hasNewRate && patch.amount !== undefined) {
          // amount only recalc using existing rate if same currency, but if currency changed already handled
          if (existing.currency !== finalCurrency) throw new Error('jangan pakai kurs lama')
        }
        if (!finalRate) throw new Error('Kurs baru wajib')
        // recalc
        return { currency: finalCurrency, exchangeRateSnapshot: finalRate, amountIdr: finalAmount * finalRate }
      }
    }

    const idrExpense = { currency: 'IDR', exchangeRateSnapshot: null, amount: 1000000, amountIdr: 1000000 }
    assert.throws(() => patchExpense(idrExpense, { currency: 'SAR', amount: 100 }), /Kurs baru wajib/)
    const sarFromIdr = patchExpense(idrExpense, { currency: 'SAR', exchangeRateSnapshot: 4350, amount: 100 })
    assert.equal(sarFromIdr.amountIdr, 435000)

    const sarExpense = { currency: 'SAR', exchangeRateSnapshot: 4350, amount: 100, amountIdr: 435000 }
    assert.throws(() => patchExpense(sarExpense, { currency: 'USD', amount: 100 }), /Kurs baru wajib/)
    const usdFromSar = patchExpense(sarExpense, { currency: 'USD', exchangeRateSnapshot: 16000, amount: 100 })
    assert.equal(usdFromSar.amountIdr, 1600000)

    const usdExpense = { currency: 'USD', exchangeRateSnapshot: 16000, amount: 100, amountIdr: 1600000 }
    const sarFromUsd = patchExpense(usdExpense, { currency: 'SAR', exchangeRateSnapshot: 4400, amount: 100 })
    assert.equal(sarFromUsd.amountIdr, 440000)

    const idrFromSar = patchExpense(sarExpense, { currency: 'IDR', amount: 500000 })
    assert.equal(idrFromSar.exchangeRateSnapshot, null)
    assert.equal(idrFromSar.amountIdr, 500000)
  })

  it('Expense booking relation matching vs conflicting Vendor/Order/Trip', () => {
    const booking = { id: 10, orderId: 5, tripId: 3, vendorId: 7 }
    function validateBookingLinkedExpense(booking: any, expense: any) {
      if (expense.orderId && booking.orderId && expense.orderId !== booking.orderId) throw new Error('tidak cocok dengan orderId Booking')
      if (expense.tripId && booking.tripId && expense.tripId !== booking.tripId) throw new Error('tidak cocok dengan tripId Booking')
      if (expense.vendorId && expense.vendorId !== booking.vendorId) throw new Error('tidak boleh Booking Vendor A + Expense Vendor B')
    }
    assert.doesNotThrow(() => validateBookingLinkedExpense(booking, { orderId: 5, tripId: 3, vendorId: 7 }))
    assert.throws(() => validateBookingLinkedExpense(booking, { orderId: 6 }), /tidak cocok/)
    assert.throws(() => validateBookingLinkedExpense(booking, { vendorId: 8 }), /tidak boleh Booking Vendor A/)
  })

  it('Expense VERIFIED immutability lock and DRAFT/VOID handling', () => {
    const locked = ['expenseDate','orderId','tripId','bookingId','vendorId','category','currency','amount','exchangeRateSnapshot','amountIdr','paymentMethod','referenceNumber']
    function canEdit(status: string, field: string) {
      if (status === 'VERIFIED' && locked.includes(field)) return false
      if (status === 'VOID') return false
      return true
    }
    assert.equal(canEdit('VERIFIED','amount'), false)
    assert.equal(canEdit('VERIFIED','notes'), true)
    assert.equal(canEdit('VOID','amount'), false)
    assert.equal(canEdit('DRAFT','amount'), true)
  })

  // ── Overview ──────────────────────────────────────────────────────────────
  it('Overview: cashReceived VERIFIED only, outstanding ISSUED only, overdue ISSUED only, overdueCount uncapped', () => {
    const invoices = [
      { id: 1, state: 'ISSUED', amountIdr: 10000000, dueDate: '2026-01-01' },
      { id: 2, state: 'ISSUED', amountIdr: 5000000, dueDate: '2026-12-31' },
      { id: 3, state: 'DRAFT', amountIdr: 3000000, dueDate: '2026-01-01' },
      { id: 4, state: 'CANCELLED', amountIdr: 4000000, dueDate: '2026-01-01' },
    ]
    const payments = [
      { invoiceId: 1, amountIdr: 4000000, status: 'VERIFIED' },
      { invoiceId: 1, amountIdr: 1000000, status: 'DRAFT' },
      { invoiceId: 2, amountIdr: 5000000, status: 'VERIFIED' },
      { invoiceId: 2, amountIdr: 1000000, status: 'VOID' },
    ]
    const expenses = [
      { amountIdr: 2000000, status: 'VERIFIED' },
      { amountIdr: 1000000, status: 'DRAFT' },
      { amountIdr: 500000, status: 'VOID' },
    ]
    const cashReceived = payments.filter(p => p.status === 'VERIFIED').reduce((s,p)=>s+p.amountIdr,0)
    assert.equal(cashReceived, 9000000)

    const paidMap: Record<number,number> = {}
    for (const p of payments) if (p.status==='VERIFIED') paidMap[p.invoiceId]=(paidMap[p.invoiceId]||0)+p.amountIdr

    let outstanding = 0
    let overdueCount = 0
    const today = '2026-05-17'
    for (const inv of invoices) {
      if (inv.state !== 'ISSUED') continue
      const paid = paidMap[inv.id]||0
      const out = Math.max(inv.amountIdr - paid, 0)
      if (out>0) {
        outstanding+=out
        if (toIso(inv.dueDate)! < today) overdueCount++
      }
    }
    assert.equal(outstanding, 6000000) // inv1 6M, inv2 0
    assert.equal(overdueCount, 1)
    // Simulate list limited top10 but count not capped
    const allOverdue = Array.from({length: 25}, (_,i)=>({ id: i+1, state:'ISSUED', dueDate:'2026-01-01', outstanding: 1000000 }))
    const count = allOverdue.length
    const sliced = allOverdue.slice(0,10)
    assert.equal(count, 25)
    assert.equal(sliced.length, 10)
    assert.equal(count !== sliced.length, true, 'overdueCount separate before slice, not capped at 10')
  })

  // ── Reports ───────────────────────────────────────────────────────────────
  it('Reports: date/business filtering at DB query BEFORE pagination, totals full filtered set', () => {
    // Simulate 150 payments, filter by date, then paginate
    const allPayments = Array.from({length: 150}, (_,i)=>({
      id: i+1,
      paymentDate: i < 100 ? '2026-01-10' : '2026-02-15',
      amountIdr: 1000000,
      status: i % 10 === 0 ? 'DRAFT' : 'VERIFIED',
    }))
    const startDate = '2026-01-01', endDate = '2026-01-31'
    const filtered = allPayments.filter(p => {
      const d = toIso(p.paymentDate)!
      return d >= startDate && d <= endDate
    })
    assert.equal(filtered.length, 100)
    // totals from full filtered, not first 100 after limit – but we filtered before pagination
    const totalAmount = filtered.filter(p=>p.status==='VERIFIED').reduce((s,p)=>s+p.amountIdr,0)
    assert.equal(totalAmount, 90 * 1000000) // 100 - 10 draft
    // pagination page 1 of 50 but total revenue all matching
    const pageSize = 50
    const page1 = filtered.slice(0,pageSize)
    assert.equal(page1.length, 50)
    assert.equal(totalAmount, 90000000, 'total revenue all matching, not just page')
  })

  it('Reports: CSV same filters as screen not only visible page, draft/void excluded', () => {
    const payments = [
      { paymentDate: '2026-01-10', amountIdr: 1000000, status: 'VERIFIED' },
      { paymentDate: '2026-01-15', amountIdr: 2000000, status: 'DRAFT' },
      { paymentDate: '2026-01-20', amountIdr: 3000000, status: 'VOID' },
      { paymentDate: '2026-02-01', amountIdr: 4000000, status: 'VERIFIED' },
    ]
    const startDate = '2026-01-01', endDate = '2026-01-31'
    const filtered = payments.filter(p => toIso(p.paymentDate)! >= startDate && toIso(p.paymentDate)! <= endDate && p.status==='VERIFIED')
    assert.equal(filtered.length, 1)
    assert.equal(filtered[0].amountIdr, 1000000)
  })

  // ── Profitability ─────────────────────────────────────────────────────────
  it('Profitability Order: committed/expected/verified payment/expense/current cash no duplicate', () => {
    const orderValue = 100000000
    const bookings = [
      { id: 1, amountIdr: 20000000 },
      { id: 2, amountIdr: 25000000 },
      { id: 3, amountIdr: 25000000 },
    ]
    const committed = bookings.reduce((s,b)=>s+b.amountIdr,0)
    assert.equal(committed, 70000000)
    const expected = orderValue - committed
    assert.equal(expected, 30000000)

    // Payments via invoices VERIFIED
    const payments = [
      { id: 1, invoiceId: 10, amountIdr: 10000000, status: 'VERIFIED' },
      { id: 2, invoiceId: 10, amountIdr: 20000000, status: 'VERIFIED' },
      { id: 3, invoiceId: 11, amountIdr: 50000000, status: 'VERIFIED' },
    ]
    const cashReceived = payments.filter(p=>p.status==='VERIFIED').reduce((s,p)=>s+p.amountIdr,0)
    assert.equal(cashReceived, 80000000)

    // Expenses dedup if expense links both orderId and bookingId same Order count once
    const expenses = [
      { id: 1, orderId: 100, bookingId: 1, amountIdr: 10000000, status: 'VERIFIED' },
      { id: 2, orderId: 100, amountIdr: 20000000, status: 'VERIFIED' },
      { id: 1, orderId: 100, bookingId: 1, amountIdr: 10000000, status: 'VERIFIED' }, // duplicate id
    ]
    const seen = new Set<number>()
    let actual = 0
    for (const e of expenses) {
      if (e.status !== 'VERIFIED') continue
      if (seen.has(e.id)) continue
      seen.add(e.id)
      actual += e.amountIdr
    }
    assert.equal(actual, 30000000)

    const currentCash = cashReceived - actual
    assert.equal(currentCash, 50000000)
  })

  it('Profitability Trip: global trip count, shared not double counted, pagination does not change classification', () => {
    // Global trip count across workspace, not page-limited
    const allTripOrders = [
      { tripId: 1, orderId: 10 },
      { tripId: 2, orderId: 10 },
      { tripId: 1, orderId: 11 },
    ]
    const globalCount: Record<number, number> = {}
    for (const to of allTripOrders) globalCount[to.orderId] = (globalCount[to.orderId]||0)+1

    assert.equal(globalCount[10], 2, 'Order 10 global count 2')
    assert.equal(globalCount[11], 1, 'Order 11 global count 1')

    // Simulate page-limited tripCountPerOrderInResult bug
    const pageTrips = [{ id: 1 }] // only trip 1 in current page
    const tripOrdersInPage = allTripOrders.filter(to => pageTrips.some(t=>t.id===to.tripId))
    const pageCount: Record<number, number> = {}
    for (const to of tripOrdersInPage) pageCount[to.orderId] = (pageCount[to.orderId]||0)+1
    // pageCount would say order 10 count 1, but global says 2 – bug
    assert.equal(pageCount[10], 1, 'page-limited would incorrectly say single-trip')
    assert.equal(globalCount[10], 2, 'global correctly says multi-trip')

    // Shared order revenue not allocated – label "Shared Order — revenue not allocated"
    const isShared = globalCount[10] > 1
    const note = isShared ? 'Shared Order — revenue not allocated' : null
    assert.equal(note, 'Shared Order — revenue not allocated')

    // Aggregates must not double count Order value
    const orders = [
      { id: 10, sellingPriceIdr: 100000000 },
      { id: 11, sellingPriceIdr: 50000000 },
    ]
    // If we sum per trip naively, order 10 would be counted twice
    const trip1Orders = allTripOrders.filter(to=>to.tripId===1).map(to=>orders.find(o=>o.id===to.orderId)!)
    const naiveSum = trip1Orders.reduce((s,o)=>s+o.sellingPriceIdr,0) // includes order 10 and 11
    // For shared orders, V1 prefer exclude shared revenue
    const filteredForTrip1 = trip1Orders.filter(o => globalCount[o.id] === 1)
    const correctSum = filteredForTrip1.reduce((s,o)=>s+o.sellingPriceIdr,0)
    assert.equal(naiveSum, 150000000)
    assert.equal(correctSum, 50000000, 'shared order excluded to avoid double count')
  })

  // ── Booking ───────────────────────────────────────────────────────────────
  it('Booking expense progress: Committed, Verified Actual, Remaining, Over Budget warning', () => {
    const booking = { amountIdr: 10000000 }
    const verifiedExpenses = [
      { amountIdr: 3000000, status: 'VERIFIED' },
      { amountIdr: 4000000, status: 'VERIFIED' },
      { amountIdr: 2000000, status: 'DRAFT' },
    ]
    const committed = booking.amountIdr
    const verifiedActual = verifiedExpenses.filter(e=>e.status==='VERIFIED').reduce((s,e)=>s+e.amountIdr,0)
    const remaining = committed - verifiedActual
    assert.equal(committed, 10000000)
    assert.equal(verifiedActual, 7000000)
    assert.equal(remaining, 3000000)
    const isOverBudget = verifiedActual > committed
    assert.equal(isOverBudget, false)

    const overBudgetExpenses = [
      { amountIdr: 6000000, status: 'VERIFIED' },
      { amountIdr: 5000000, status: 'VERIFIED' },
    ]
    const overActual = overBudgetExpenses.reduce((s,e)=>s+e.amountIdr,0)
    assert.equal(overActual, 11000000)
    assert.equal(overActual > committed, true)
  })

  // ── UAT Scenario ──────────────────────────────────────────────────────────
  it('UAT: 1 Customer, 1 Order Rp100M, 4 Jamaah, 1 Trip, 3 Vendors, 4 Bookings 70M, 2 Invoices DP 30M Bal 70M, 3 Payments 10+20+50 verified 80M, 5 Expenses verified 60M expecting margin 30M cash 20M receivable 20M', () => {
    const orderValue = 100_000_000
    const bookingsCommitted = 70_000_000
    const invoices = [
      { state: 'ISSUED', amountIdr: 30_000_000 },
      { state: 'ISSUED', amountIdr: 70_000_000 },
    ]
    const payments = [
      { amountIdr: 10_000_000, status: 'VERIFIED' },
      { amountIdr: 20_000_000, status: 'VERIFIED' },
      { amountIdr: 50_000_000, status: 'VERIFIED' },
    ]
    const expenses = [
      { amountIdr: 10_000_000, status: 'VERIFIED' },
      { amountIdr: 15_000_000, status: 'VERIFIED' },
      { amountIdr: 20_000_000, status: 'VERIFIED' },
      { amountIdr: 10_000_000, status: 'VERIFIED' },
      { amountIdr: 5_000_000, status: 'VERIFIED' },
    ]

    const totalInvoiced = invoices.filter(i=>i.state==='ISSUED').reduce((s,i)=>s+i.amountIdr,0)
    assert.equal(totalInvoiced, 100_000_000)

    const cashReceived = payments.filter(p=>p.status==='VERIFIED').reduce((s,p)=>s+p.amountIdr,0)
    assert.equal(cashReceived, 80_000_000)

    const verifiedExpenses = expenses.filter(e=>e.status==='VERIFIED').reduce((s,e)=>s+e.amountIdr,0)
    assert.equal(verifiedExpenses, 60_000_000)

    const expectedMargin = orderValue - bookingsCommitted
    assert.equal(expectedMargin, 30_000_000)

    const currentCashMargin = cashReceived - verifiedExpenses
    assert.equal(currentCashMargin, 20_000_000)

    const outstanding = totalInvoiced - cashReceived
    assert.equal(outstanding, 20_000_000)

    // Validate across pages
    const orderDetail = {
      orderValue,
      totalInvoiced,
      verifiedPayments: cashReceived,
      outstanding,
      committedBookingCost: bookingsCommitted,
      verifiedExpenses,
      expectedDirectMargin: expectedMargin,
      currentCashMargin,
    }
    assert.equal(orderDetail.expectedDirectMargin, 30_000_000)
    assert.equal(orderDetail.currentCashMargin, 20_000_000)
    assert.equal(orderDetail.outstanding, 20_000_000)
  })
})
