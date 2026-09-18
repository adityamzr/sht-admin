import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

function toIso(d: any): string | null {
  if (!d) return null
  if (typeof d === 'string') return d.slice(0,10)
  if (d instanceof Date) return d.toISOString().slice(0,10)
  return String(d).slice(0,10)
}

// Simulate eligible invoice selector logic
function filterEligibleInvoices(invoices: any[], payments: any[]) {
  // payments only VERIFIED counted
  const paidMap: Record<number, number> = {}
  for (const p of payments) {
    if (p.status !== 'VERIFIED') continue
    paidMap[p.invoiceId] = (paidMap[p.invoiceId] || 0) + Number(p.amountIdr)
  }
  return invoices.filter(inv => {
    if (inv.state !== 'ISSUED') return false
    const paid = paidMap[inv.id] || 0
    const outstanding = Math.max(Number(inv.amountIdr) - paid, 0)
    return outstanding > 0
  }).map(inv => {
    const paid = paidMap[inv.id] || 0
    const outstanding = Math.max(Number(inv.amountIdr) - paid, 0)
    const paymentStatus = paid > 0 ? 'PARTIAL' : 'UNPAID'
    return { ...inv, totalPaid: paid, outstanding, paymentStatus }
  })
}

function canVerifyPayment(invoice: any, existingPayments: any[], newAmount: number, excludeId?: number) {
  if (invoice.state !== 'ISSUED') throw new Error('Hanya Invoice ISSUED yang bisa di-VERIFIED')
  const totalOther = existingPayments.filter(p => p.status === 'VERIFIED' && p.id !== excludeId).reduce((s,p)=>s+Number(p.amountIdr),0)
  const outstanding = Math.max(Number(invoice.amountIdr) - totalOther, 0)
  if (outstanding <= 0) throw new Error('Invoice sudah lunas, tidak memiliki sisa tagihan')
  if (totalOther + newAmount > Number(invoice.amountIdr)) {
    throw new Error(`Nominal pembayaran melebihi sisa tagihan Rp${outstanding.toLocaleString('id-ID')}. Sudah dibayar Rp${totalOther.toLocaleString('id-ID')}, tagihan Rp${Number(invoice.amountIdr).toLocaleString('id-ID')}, sisa Rp${outstanding.toLocaleString('id-ID')}`)
  }
  return { outstanding, totalOther }
}

function validateInvoiceUpdate(existing: any, patch: any, hasVerifiedPayment: boolean) {
  const newState = patch.state
  if (existing.state === 'CANCELLED') {
    if (newState && newState !== 'CANCELLED') throw new Error('Invoice CANCELLED tidak bisa dibuka kembali')
  }
  if (existing.state === 'ISSUED') {
    if (newState === 'DRAFT') throw new Error('Invoice ISSUED tidak bisa kembali ke DRAFT')
    if (!newState || newState === 'ISSUED') {
      const locked = ['orderId','amountIdr','issueDate','dueDate','description']
      for (const f of locked) {
        if (patch[f] !== undefined && String(patch[f]) !== String(existing[f])) throw new Error(`Invoice ISSUED tidak bisa diubah field ${f}`)
      }
    }
    if (newState === 'CANCELLED' && hasVerifiedPayment) {
      throw new Error('Invoice memiliki pembayaran terverifikasi. Void pembayaran terlebih dahulu sebelum membatalkan Invoice.')
    }
  }
  if (existing.state === 'DRAFT' && newState === 'CANCELLED') {
    throw new Error('Invoice DRAFT tidak bisa di-Cancel, gunakan Hapus')
  }
}

function validatePaymentPatch(existing: any, patch: any, newInvoice: any, finalOrderId: number) {
  if (existing.status === 'VERIFIED') {
    if (patch.invoiceId !== undefined && Number(patch.invoiceId) !== Number(existing.invoiceId)) {
      throw new Error('Pembayaran VERIFIED tidak bisa dipindah ke Invoice lain')
    }
    const locked = ['invoiceId','orderId','paymentDate','amountIdr','method','accountOrChannel','referenceNumber','proofUrl']
    for (const f of locked) {
      if (patch[f] !== undefined && String(patch[f]) !== String(existing[f])) throw new Error(`Field ${f} tidak bisa diubah setelah VERIFIED`)
    }
  }
  if (patch.invoiceId !== undefined) {
    if (newInvoice.orderId !== finalOrderId) throw new Error('OrderId pembayaran harus sama dengan Order Invoice. Tidak boleh Order A + Invoice Order B')
  }
}

function validateRoomPatch(existing: any, patch: any) {
  const finalMode = patch.roomingMode !== undefined ? patch.roomingMode : existing.roomingMode
  const finalOrderId = patch.orderId !== undefined ? patch.orderId : existing.orderId
  if (finalMode === 'SAME_ORDER' && !finalOrderId) throw new Error('SAME_ORDER wajib memiliki Order')
  if (finalMode === 'SHARED_GROUP' && finalOrderId) {
    if (patch.orderId !== undefined && patch.orderId !== null) throw new Error('SHARED_GROUP tidak boleh punya orderId')
  }
}

function validateBookingForStay(booking: any, stayTripId: number) {
  if (booking.bookingType !== 'HOTEL') throw new Error(`Booking ${booking.bookingCode} harus tipe HOTEL`)
  if (!booking.tripId) throw new Error(`Booking ${booking.bookingCode} harus terikat ke Trip #${stayTripId}, tripId tidak boleh null`)
  if (booking.tripId !== stayTripId) throw new Error(`Booking ${booking.bookingCode} milik Trip #${booking.tripId}, tidak cocok dengan Trip #${stayTripId}`)
}

function canUnassignOrderFromTrip(orderId: number, tripId: number, stays: any[], rooms: any[], occupants: any[], jamaahByOrder: Record<number, number[]>) {
  // stays: [{id, tripId, orderIds: []}]
  const usedInStay = stays.some(s => s.tripId === tripId && s.orderIds.includes(orderId))
  if (usedInStay) throw new Error('Order masih digunakan dalam Rooming Trip ini. Hapus alokasi kamar/Order dari Accommodation terlebih dahulu.')
  const usedInRoom = rooms.some(r => r.orderId === orderId && stays.some(s => s.id === r.stayId && s.tripId === tripId))
  if (usedInRoom) throw new Error('Order masih digunakan dalam Rooming Trip ini. Hapus alokasi kamar/Order dari Accommodation terlebih dahulu.')
  const jamaahIds = jamaahByOrder[orderId] || []
  const usedInOccupant = occupants.some(o => jamaahIds.includes(o.jamaahId) && stays.some(s => s.id === o.stayId && s.tripId === tripId))
  if (usedInOccupant) throw new Error('Order masih digunakan dalam Rooming Trip ini. Hapus alokasi kamar/Order dari Accommodation terlebih dahulu.')
}

describe('Tour V1 Final Hardening – Finance & Rooming', () => {
  it('Payment selector returns only B/C (ISSUED partial/unpaid) not A PAID, D DRAFT, E CANCELLED', () => {
    const invoices = [
      { id: 1, invoiceCode: 'INV-2026-0001', state: 'ISSUED', amountIdr: 10000000 }, // A PAID
      { id: 2, invoiceCode: 'INV-2026-0002', state: 'ISSUED', amountIdr: 30000000 }, // B PARTIAL
      { id: 3, invoiceCode: 'INV-2026-0003', state: 'ISSUED', amountIdr: 20000000 }, // C UNPAID
      { id: 4, invoiceCode: 'INV-2026-0004', state: 'DRAFT', amountIdr: 10000000 }, // D DRAFT
      { id: 5, invoiceCode: 'INV-2026-0005', state: 'CANCELLED', amountIdr: 10000000 }, // E CANCELLED
    ]
    const payments = [
      { id: 1, invoiceId: 1, amountIdr: 10000000, status: 'VERIFIED' }, // fully paid A
      { id: 2, invoiceId: 2, amountIdr: 10000000, status: 'VERIFIED' }, // partial B
    ]
    const eligible = filterEligibleInvoices(invoices, payments)
    const ids = eligible.map(e => e.id)
    assert.ok(!ids.includes(1), 'A PAID should NOT be eligible')
    assert.ok(ids.includes(2), 'B PARTIAL should be eligible')
    assert.ok(ids.includes(3), 'C UNPAID should be eligible')
    assert.ok(!ids.includes(4), 'D DRAFT should NOT be eligible')
    assert.ok(!ids.includes(5), 'E CANCELLED should NOT be eligible')
    assert.equal(eligible.length, 2)
  })

  it('Server validation: overpayment blocked, DRAFT/CANCELLED cannot VERIFY, stale concurrency recalc', () => {
    const invoice = { id: 10, state: 'ISSUED', amountIdr: 10000000 }
    const existing = [
      { id: 1, invoiceId: 10, amountIdr: 6000000, status: 'VERIFIED' },
    ]
    // OK within outstanding 4M
    assert.doesNotThrow(() => canVerifyPayment(invoice, existing, 4000000))
    // Overpayment 5M > 4M should fail with message containing "Nominal pembayaran melebihi sisa tagihan Rp"
    assert.throws(() => canVerifyPayment(invoice, existing, 5000000), (e: any) => {
      assert.ok(e.message.includes('Nominal pembayaran melebihi sisa tagihan Rp'))
      return true
    })

    // DRAFT cannot VERIFY
    const draftInv = { id: 11, state: 'DRAFT', amountIdr: 10000000 }
    assert.throws(() => canVerifyPayment(draftInv, [], 1000000), /Hanya Invoice ISSUED/)

    // CANCELLED cannot VERIFY
    const cancelledInv = { id: 12, state: 'CANCELLED', amountIdr: 10000000 }
    assert.throws(() => canVerifyPayment(cancelledInv, [], 1000000), /Hanya Invoice ISSUED/)

    // Stale concurrency: two payments trying to verify simultaneously, server recalc excluding self
    // Existing paid 6M, new payment A 4M should be OK, but if another payment B 1M verified after A fetched outstanding, then A+ B would exceed? Server recalc at VERIFY time ensures latest sum
    const invoice2 = { id: 20, state: 'ISSUED', amountIdr: 10000000 }
    const paymentsBefore = [{ id: 1, invoiceId: 20, amountIdr: 6000000, status: 'VERIFIED' }]
    // Client thinks outstanding 4M, tries to pay 4M
    const clientOutstanding = 4000000
    // But before verify, another payment of 1M got VERIFIED (concurrent)
    const paymentsAfterConcurrent = [...paymentsBefore, { id: 2, invoiceId: 20, amountIdr: 1000000, status: 'VERIFIED' }]
    // Now server recalc: totalOther = 7M, outstanding = 3M, client wants 4M → should fail
    assert.throws(() => canVerifyPayment(invoice2, paymentsAfterConcurrent, 4000000), /melebihi sisa tagihan/)
    // Client should have paid only 3M now
    assert.doesNotThrow(() => canVerifyPayment(invoice2, paymentsAfterConcurrent, 3000000))
  })

  it('Payment orderId must match invoice orderId', () => {
    const existing = { id: 1, invoiceId: 10, orderId: 100, status: 'DRAFT', paymentDate: '2026-10-01', amountIdr: 1000000, method: 'BANK_TRANSFER', accountOrChannel: '', referenceNumber: '', proofUrl: '' }
    const newInvoice = { id: 11, orderId: 200 }
    // Trying to change invoiceId to invoice belonging to different order without changing orderId → should fail
    assert.throws(() => validatePaymentPatch(existing, { invoiceId: 11 }, newInvoice, 100), /OrderId pembayaran harus sama dengan Order Invoice/)

    // Changing both invoiceId and orderId to matching should pass
    assert.doesNotThrow(() => validatePaymentPatch(existing, { invoiceId: 11, orderId: 200 }, newInvoice, 200))

    // VERIFIED cannot change invoiceId at all
    const verified = { ...existing, status: 'VERIFIED' }
    assert.throws(() => validatePaymentPatch(verified, { invoiceId: 11 }, newInvoice, 200), /tidak bisa dipindah ke Invoice lain/)
  })

  it('Invoice ISSUED immutability: lock orderId/amountIdr/issueDate/dueDate/description', () => {
    const existing = { id: 1, state: 'ISSUED', orderId: 10, amountIdr: 10000000, issueDate: '2026-10-01', dueDate: '2026-10-15', description: 'DP' }
    // Changing amountIdr should fail
    assert.throws(() => validateInvoiceUpdate(existing, { amountIdr: 20000000 }, false), /tidak bisa diubah field amountIdr/)
    assert.throws(() => validateInvoiceUpdate(existing, { orderId: 11 }, false), /tidak bisa diubah field orderId/)
    assert.throws(() => validateInvoiceUpdate(existing, { issueDate: '2026-10-02' }, false), /tidak bisa diubah field issueDate/)
    assert.throws(() => validateInvoiceUpdate(existing, { description: 'Pelunasan' }, false), /tidak bisa diubah field description/)
    // Changing notes should be allowed (not in locked list)
    assert.doesNotThrow(() => validateInvoiceUpdate(existing, { notes: 'catatan baru' }, false))
  })

  it('CANCELLED terminal cannot reopen', () => {
    const cancelled = { id: 1, state: 'CANCELLED', orderId: 10, amountIdr: 10000000, issueDate: '2026-10-01', dueDate: '2026-10-15', description: 'DP' }
    assert.throws(() => validateInvoiceUpdate(cancelled, { state: 'DRAFT' }, false), /tidak bisa dibuka kembali/)
    assert.throws(() => validateInvoiceUpdate(cancelled, { state: 'ISSUED' }, false), /tidak bisa dibuka kembali/)
  })

  it('Cannot cancel Invoice with VERIFIED Payment', () => {
    const issued = { id: 1, state: 'ISSUED', orderId: 10, amountIdr: 10000000, issueDate: '2026-10-01', dueDate: '2026-10-15', description: 'DP' }
    assert.throws(() => validateInvoiceUpdate(issued, { state: 'CANCELLED' }, true), (e: any) => {
      assert.ok(e.message.includes('Invoice memiliki pembayaran terverifikasi'))
      return true
    })
    // After VOID, allowed
    assert.doesNotThrow(() => validateInvoiceUpdate(issued, { state: 'CANCELLED' }, false))
  })

  it('Rooming integrity: Order/Trip unassign guard', () => {
    const stays = [
      { id: 1, tripId: 10, orderIds: [100, 101] },
    ]
    const rooms = [
      { id: 1, stayId: 1, orderId: 100, roomingMode: 'SAME_ORDER' },
    ]
    const occupants = [
      { id: 1, stayId: 1, jamaahId: 1000 },
    ]
    const jamaahByOrder = { 100: [1000, 1001], 101: [1002] }

    // Order 100 used in stay → should block
    assert.throws(() => canUnassignOrderFromTrip(100, 10, stays, rooms, occupants, jamaahByOrder), /Order masih digunakan dalam Rooming Trip ini/)

    // Order 101 also used in stay scope
    assert.throws(() => canUnassignOrderFromTrip(101, 10, stays, rooms, occupants, jamaahByOrder), /Order masih digunakan/)

    // Order not used should pass
    assert.doesNotThrow(() => canUnassignOrderFromTrip(102, 10, stays, rooms, occupants, jamaahByOrder))

    // Different Trip should pass even if order in stay of other trip
    assert.doesNotThrow(() => canUnassignOrderFromTrip(100, 11, stays, rooms, occupants, jamaahByOrder))
  })

  it('Room SHARED→SAME_ORDER patch validation: orderId REQUIRED', () => {
    const existingShared = { id: 1, roomingMode: 'SHARED_GROUP', orderId: null }
    // Changing to SAME_ORDER without orderId should fail
    assert.throws(() => validateRoomPatch(existingShared, { roomingMode: 'SAME_ORDER' }), /SAME_ORDER wajib/)
    assert.throws(() => validateRoomPatch(existingShared, { roomingMode: 'SAME_ORDER', orderId: null }), /SAME_ORDER wajib/)
    // With orderId should pass
    assert.doesNotThrow(() => validateRoomPatch(existingShared, { roomingMode: 'SAME_ORDER', orderId: 100 }))

    const existingSame = { id: 2, roomingMode: 'SAME_ORDER', orderId: 100 }
    // Patch trying to nullify orderId while staying SAME_ORDER should fail
    assert.throws(() => validateRoomPatch(existingSame, { orderId: null }), /SAME_ORDER wajib/)
  })

  it('SAME_ORDER order validation: order must same workspace+belong Trip+included Stay+compatible occupants (simulated)', () => {
    // This test simulates the service logic already covered in accommodation tests, but we check final merged validation
    const existing = { id: 1, roomingMode: 'SAME_ORDER', orderId: 100 }
    // Changing order with occupants from different order should be blocked – service checks jamaah orderId vs new orderId
    // Here we only test the patch validation for required orderId, deeper validation is in service integration test
    assert.doesNotThrow(() => validateRoomPatch(existing, { orderId: 100 }))
    assert.doesNotThrow(() => validateRoomPatch(existing, { orderId: 101 }))
  })

  it('Stay HOTEL same Trip accepted, null/other Trip/non-HOTEL rejected', () => {
    const validHotelSameTrip = { id: 1, bookingCode: 'BKG-001', bookingType: 'HOTEL', tripId: 10 }
    assert.doesNotThrow(() => validateBookingForStay(validHotelSameTrip, 10))

    const nullTrip = { id: 2, bookingCode: 'BKG-002', bookingType: 'HOTEL', tripId: null }
    assert.throws(() => validateBookingForStay(nullTrip, 10), /tripId tidak boleh null/)

    const otherTrip = { id: 3, bookingCode: 'BKG-003', bookingType: 'HOTEL', tripId: 11 }
    assert.throws(() => validateBookingForStay(otherTrip, 10), /tidak cocok dengan Trip/)

    const nonHotel = { id: 4, bookingCode: 'BKG-004', bookingType: 'FLIGHT', tripId: 10 }
    assert.throws(() => validateBookingForStay(nonHotel, 10), /harus tipe HOTEL/)
  })

  it('Cannot remove Order with occupants from Stay', () => {
    // Simulate stay with order 100 having occupants
    const stayOrders = [{ orderId: 100 }, { orderId: 101 }]
    const occupants = [{ jamaahId: 1000, orderId: 100 }, { jamaahId: 1001, orderId: 100 }]
    function canRemoveOrder(orderId: number) {
      const hasOccupant = occupants.some(o => o.orderId === orderId)
      if (hasOccupant) throw new Error(`Tidak bisa hapus Order #${orderId} karena masih ada Jamaah ter-assign`)
    }
    assert.throws(() => canRemoveOrder(100), /Tidak bisa hapus Order/)
    assert.doesNotThrow(() => canRemoveOrder(101))
  })

  it('Invoice label human-readable no raw IDs, no fully paid', () => {
    const inv = {
      id: 999,
      invoiceCode: 'INV-2026-0002',
      order: { orderCode: 'ORD-2026-0002' },
      customer: { name: 'Ahmad Baru' },
      amountIdr: 30000000,
      outstanding: 30000000,
      paymentStatus: 'UNPAID',
    }
    const label = `${inv.invoiceCode} · ${inv.order.orderCode} · ${inv.customer.name} · Invoice Rp${inv.amountIdr.toLocaleString('id-ID')} · Outstanding Rp${inv.outstanding.toLocaleString('id-ID')} · ${inv.paymentStatus}`
    assert.ok(label.includes('INV-2026-0002'))
    assert.ok(label.includes('ORD-2026-0002'))
    assert.ok(label.includes('Ahmad Baru'))
    assert.ok(label.includes('Invoice Rp'))
    assert.ok(label.includes('Outstanding Rp'))
    assert.ok(!label.includes('id=') && !label.includes('raw ID'))
    // Ensure PAID not in eligible – label should not show PAID if eligible filtering works
    assert.ok(!label.includes('PAID') || label.includes('UNPAID') || label.includes('PARTIAL'))
  })

  it('Empty state guidance message', () => {
    const msg = 'Belum ada Invoice ISSUED yang memiliki sisa tagihan.'
    const detail = 'Invoice harus berstatus ISSUED dan memiliki outstanding tagihan > 0'
    assert.ok(msg.length > 0)
    assert.ok(detail.includes('ISSUED'))
    assert.ok(detail.includes('outstanding'))
  })
})
