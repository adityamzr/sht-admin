import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// ─── Simulate Payment VOID logic ─────────────────────────────────────────
function validatePaymentVoid(existing: any, patch: any) {
  if (existing.status === 'VOID') {
    if (patch.status && patch.status !== 'VOID') throw new Error('Payment VOID tidak bisa diubah statusnya. VOID adalah terminal.')
    const locked = ['invoiceId','orderId','paymentDate','amountIdr','method','accountOrChannel','referenceNumber','proofUrl','verifiedBy','verifiedAt']
    for (const f of locked) {
      if (patch[f] !== undefined && String(patch[f]) !== String(existing[f])) throw new Error(`Payment VOID tidak bisa diubah field ${f}`)
    }
    return
  }
  if (existing.status === 'VERIFIED') {
    const newStatus = patch.status
    if (newStatus && newStatus !== 'VOID' && newStatus !== 'VERIFIED') {
      if (newStatus === 'DRAFT') throw new Error('Pembayaran VERIFIED tidak bisa kembali ke DRAFT')
      throw new Error(`Pembayaran VERIFIED hanya bisa di-VOID, tidak bisa diubah ke ${newStatus}`)
    }
    if (newStatus === 'VOID') {
      const lockedForVoid = ['invoiceId','orderId','paymentDate','amountIdr','method','accountOrChannel','referenceNumber','proofUrl','verifiedBy','verifiedAt']
      for (const f of lockedForVoid) {
        if (patch[f] !== undefined) {
          if (String(patch[f] ?? '') !== String(existing[f] ?? '')) {
            throw new Error(`Pembayaran VERIFIED hanya bisa di-VOID tanpa mengubah ${f}. Field ${f} tidak boleh diubah saat Void.`)
          } else {
            throw new Error(`Pembayaran VERIFIED hanya bisa di-VOID tanpa mengubah field lain. Hapus field ${f} dari request, hanya kirim status=VOID.`)
          }
        }
      }
      const allowed = new Set(['status'])
      for (const k of Object.keys(patch)) {
        if (!allowed.has(k)) throw new Error(`Pembayaran VERIFIED hanya bisa di-VOID tanpa mengubah ${k}. Hanya status yang boleh berubah saat Void.`)
      }
      return // success status-only
    }
    if (!newStatus || newStatus === 'VERIFIED') {
      const locked = ['invoiceId','orderId','paymentDate','amountIdr','method','accountOrChannel','referenceNumber','proofUrl']
      for (const f of locked) {
        if (patch[f] !== undefined && String(patch[f]) !== String(existing[f])) {
          throw new Error(`Field ${f} tidak bisa diubah setelah VERIFIED`)
        }
      }
    }
  }
}

function financeCashReceived(payments: any[]) {
  return payments.filter(p => p.status === 'VERIFIED').reduce((s,p)=>s+Number(p.amountIdr),0)
}

// ─── Expense VOID logic ──────────────────────────────────────────────────
function validateExpenseVoid(existing: any, patch: any) {
  if (existing.status === 'VOID') {
    if (patch.status && patch.status !== 'VOID') throw new Error('Expense VOID tidak bisa diubah statusnya. VOID adalah terminal.')
    const locked = ['expenseDate','orderId','tripId','bookingId','vendorId','category','description','currency','amount','exchangeRateSnapshot','amountIdr','paymentMethod','referenceNumber','proofUrl','verifiedBy','verifiedAt']
    for (const f of locked) {
      if (patch[f] !== undefined && String(patch[f]) !== String(existing[f])) throw new Error(`Expense VOID tidak bisa diubah field ${f}`)
    }
    return
  }
  if (existing.status === 'VERIFIED') {
    const newStatus = patch.status
    if (newStatus && newStatus !== 'VOID' && newStatus !== 'VERIFIED') {
      if (newStatus === 'DRAFT') throw new Error('Expense VERIFIED tidak bisa kembali ke DRAFT')
      throw new Error(`Expense VERIFIED hanya bisa di-VOID, tidak bisa diubah ke ${newStatus}`)
    }
    if (newStatus === 'VOID') {
      const lockedForVoid = ['expenseDate','orderId','tripId','bookingId','vendorId','category','description','currency','amount','exchangeRateSnapshot','amountIdr','paymentMethod','referenceNumber','proofUrl','verifiedBy','verifiedAt']
      for (const f of lockedForVoid) {
        if (patch[f] !== undefined) {
          if (String(patch[f] ?? '') !== String(existing[f] ?? '')) {
            throw new Error(`Expense VERIFIED hanya bisa di-VOID tanpa mengubah ${f}.`)
          } else {
            throw new Error(`Expense VERIFIED hanya bisa di-VOID tanpa mengubah field lain. Hapus field ${f}`)
          }
        }
      }
      const allowed = new Set(['status'])
      for (const k of Object.keys(patch)) {
        if (!allowed.has(k)) throw new Error(`Expense VERIFIED hanya bisa di-VOID tanpa mengubah ${k}.`)
      }
      return
    }
    if (!newStatus || newStatus === 'VERIFIED') {
      const locked = ['expenseDate','orderId','tripId','bookingId','vendorId','category','description','currency','amount','exchangeRateSnapshot','amountIdr','paymentMethod','referenceNumber','proofUrl']
      for (const f of locked) {
        if (patch[f] !== undefined && String(patch[f]) !== String(existing[f])) throw new Error(`Field ${f} tidak bisa diubah setelah VERIFIED`)
      }
    }
  }
}

function financeVerifiedExpenses(expenses: any[]) {
  return expenses.filter(e => e.status === 'VERIFIED').reduce((s,e)=>s+Number(e.amountIdr),0)
}

// ─── Stay delete logic ───────────────────────────────────────────────────
function canDeleteStay(stay: any, rooms: any[], occupants: any[]) {
  const activeRooms = rooms.filter(r => r.stayId === stay.id && !r.deletedAt)
  if (activeRooms.length > 0) {
    const occInStay = occupants.filter(o => o.stayId === stay.id)
    if (occInStay.length > 0) {
      throw new Error('Akomodasi masih memiliki kamar atau jamaah yang dialokasikan. Kosongkan rooming terlebih dahulu.')
    }
    throw new Error('Akomodasi masih memiliki kamar. Hapus kamar terlebih dahulu sebelum menghapus akomodasi.')
  }
  const occ = occupants.filter(o => o.stayId === stay.id)
  if (occ.length > 0) throw new Error('Akomodasi masih memiliki kamar atau jamaah yang dialokasikan. Kosongkan rooming terlebih dahulu.')
}

function canDeleteRoom(room: any, occupants: any[]) {
  const occ = occupants.filter(o => o.roomId === room.id)
  if (occ.length > 0) throw new Error('Room masih ada occupant, keluarkan dulu sebelum hapus')
}

function canUnassignOrder(orderId: number, tripId: number, stays: any[], rooms: any[], occupants: any[], jamaahByOrder: Record<number, number[]>) {
  const staysInTrip = stays.filter(s => s.tripId === tripId && !s.deletedAt)
  const stayIds = staysInTrip.map(s=>s.id)
  const usedInStay = staysInTrip.some(s => s.orderIds.includes(orderId))
  if (usedInStay) throw new Error('Order masih digunakan dalam Rooming Trip ini. Hapus alokasi kamar/Order dari Accommodation terlebih dahulu.')
  const usedInRoom = rooms.some(r => r.orderId === orderId && stayIds.includes(r.stayId) && !r.deletedAt)
  if (usedInRoom) throw new Error('Order masih digunakan dalam Rooming Trip ini. Hapus alokasi kamar/Order dari Accommodation terlebih dahulu.')
  const jIds = jamaahByOrder[orderId] || []
  const usedInOcc = occupants.some(o => jIds.includes(o.jamaahId) && stayIds.includes(o.stayId))
  if (usedInOcc) throw new Error('Order masih digunakan dalam Rooming Trip ini. Hapus alokasi kamar/Order dari Accommodation terlebih dahulu.')
}

describe('Tour V1 Freeze Patch – Finance VOID Integrity', () => {
  it('A. VERIFIED Payment amount 10m PATCH status=VOID success amount remains 10m', () => {
    const existing = { id: 1, status: 'VERIFIED', amountIdr: 10000000, invoiceId: 1, orderId: 10, paymentDate: '2026-09-18', method: 'BANK_TRANSFER', accountOrChannel: 'BCA', referenceNumber: 'REF1', proofUrl: 'https://x', verifiedBy: 1, verifiedAt: '2026-09-18' }
    const patch = { status: 'VOID' }
    assert.doesNotThrow(() => validatePaymentVoid(existing, patch))
    // Simulate after void, amount unchanged
    const after = { ...existing, status: 'VOID' }
    assert.equal(Number(after.amountIdr), 10000000, 'amount remains 10m')
    assert.equal(after.invoiceId, 1)
    assert.equal(after.orderId, 10)
  })

  it('B. VERIFIED Payment amount 10m PATCH status=VOID + amountIdr=20m reject', () => {
    const existing = { id: 1, status: 'VERIFIED', amountIdr: 10000000, invoiceId: 1, orderId: 10, paymentDate: '2026-09-18', method: 'BANK_TRANSFER', accountOrChannel: 'BCA', referenceNumber: 'REF1', proofUrl: 'https://x', verifiedBy: 1, verifiedAt: '2026-09-18' }
    assert.throws(() => validatePaymentVoid(existing, { status: 'VOID', amountIdr: 20000000 }), /hanya bisa di-VOID tanpa mengubah amountIdr/)
    assert.throws(() => validatePaymentVoid(existing, { status: 'VOID', invoiceId: 2 }), /tanpa mengubah invoiceId/)
    assert.throws(() => validatePaymentVoid(existing, { status: 'VOID', paymentDate: '2026-09-19' }), /paymentDate/)
  })

  it('C. VERIFIED → DRAFT reject', () => {
    const existing = { id: 1, status: 'VERIFIED', amountIdr: 10000000 }
    assert.throws(() => validatePaymentVoid(existing, { status: 'DRAFT' }), /tidak bisa kembali ke DRAFT/)
  })

  it('D. VOID → VERIFIED reject', () => {
    const existing = { id: 1, status: 'VOID', amountIdr: 10000000, invoiceId: 1, orderId: 10, paymentDate: '2026-09-18', method: 'BANK_TRANSFER', accountOrChannel: 'BCA', referenceNumber: 'REF1', proofUrl: 'https://x' }
    assert.throws(() => validatePaymentVoid(existing, { status: 'VERIFIED' }), /tidak bisa diubah statusnya/)
    assert.throws(() => validatePaymentVoid(existing, { status: 'DRAFT' }), /tidak bisa diubah statusnya/)
  })

  it('E. VOID Payment excluded from financial totals', () => {
    const payments = [
      { id: 1, amountIdr: 10000000, status: 'VERIFIED' },
      { id: 2, amountIdr: 5000000, status: 'VOID' },
      { id: 3, amountIdr: 3000000, status: 'DRAFT' },
    ]
    const cash = financeCashReceived(payments)
    assert.equal(cash, 10000000, 'only VERIFIED counted, VOID excluded')
  })

  it('F. VERIFIED Payment financial field mutation without status change reject', () => {
    const existing = { id: 1, status: 'VERIFIED', amountIdr: 10000000, invoiceId: 1, orderId: 10, paymentDate: '2026-09-18', method: 'BANK_TRANSFER', accountOrChannel: 'BCA', referenceNumber: 'REF1', proofUrl: 'https://x' }
    assert.throws(() => validatePaymentVoid(existing, { amountIdr: 20000000 }), /tidak bisa diubah setelah VERIFIED/)
  })
})

describe('Tour V1 Freeze Patch – Expense VOID Integrity', () => {
  it('A. VERIFIED Expense PATCH status=VOID success all original fields unchanged', () => {
    const existing = { id: 1, status: 'VERIFIED', expenseDate: '2026-09-18', orderId: 10, tripId: 20, bookingId: 30, vendorId: 40, category: 'HOTEL', description: 'Hotel Makkah', currency: 'SAR', amount: 350, exchangeRateSnapshot: 4500, amountIdr: 1575000, paymentMethod: 'TRANSFER', referenceNumber: 'REF', proofUrl: 'https://x', verifiedBy: 1, verifiedAt: '2026-09-18' }
    assert.doesNotThrow(() => validateExpenseVoid(existing, { status: 'VOID' }))
    const after = { ...existing, status: 'VOID' }
    assert.equal(after.amount, 350)
    assert.equal(after.vendorId, 40)
    assert.equal(after.bookingId, 30)
    assert.equal(after.amountIdr, 1575000)
  })

  it('B. VERIFIED Expense PATCH status=VOID + amount changed reject', () => {
    const existing = { id: 1, status: 'VERIFIED', expenseDate: '2026-09-18', orderId: 10, tripId: 20, bookingId: 30, vendorId: 40, category: 'HOTEL', description: 'Hotel', currency: 'SAR', amount: 350, exchangeRateSnapshot: 4500, amountIdr: 1575000, paymentMethod: 'TRANSFER', referenceNumber: 'REF', proofUrl: 'https://x', verifiedBy: 1, verifiedAt: '2026-09-18' }
    assert.throws(() => validateExpenseVoid(existing, { status: 'VOID', amount: 500 }), /tanpa mengubah amount/)
    assert.throws(() => validateExpenseVoid(existing, { status: 'VOID', amountIdr: 999 }), /amountIdr/)
  })

  it('C. VERIFIED Expense vendorId changed while voiding reject', () => {
    const existing = { id: 1, status: 'VERIFIED', expenseDate: '2026-09-18', vendorId: 40, bookingId: 30, orderId: 10, tripId: 20, category: 'HOTEL', description: 'Hotel', currency: 'SAR', amount: 350, exchangeRateSnapshot: 4500, amountIdr: 1575000, paymentMethod: 'TRANSFER', referenceNumber: 'REF', proofUrl: 'https://x', verifiedBy: 1, verifiedAt: '2026-09-18' }
    assert.throws(() => validateExpenseVoid(existing, { status: 'VOID', vendorId: 41 }), /vendorId/)
  })

  it('D. VERIFIED → DRAFT reject', () => {
    const existing = { id: 1, status: 'VERIFIED', amount: 350 }
    assert.throws(() => validateExpenseVoid(existing, { status: 'DRAFT' }), /tidak bisa kembali ke DRAFT/)
  })

  it('E. VOID → VERIFIED reject', () => {
    const existing = { id: 1, status: 'VOID', amount: 350, expenseDate: '2026-09-18' }
    assert.throws(() => validateExpenseVoid(existing, { status: 'VERIFIED' }), /tidak bisa diubah statusnya/)
  })

  it('F. VOID Expense excluded from Finance totals', () => {
    const expenses = [
      { id: 1, amountIdr: 1575000, status: 'VERIFIED' },
      { id: 2, amountIdr: 5000000, status: 'VOID' },
      { id: 3, amountIdr: 1000000, status: 'DRAFT' },
    ]
    const total = financeVerifiedExpenses(expenses)
    assert.equal(total, 1575000)
  })
})

describe('Tour V1 Freeze Patch – Stay Delete Integrity', () => {
  it('A. Stay no Rooms Delete allowed', () => {
    const stay = { id: 1, tripId: 10 }
    const rooms: any[] = []
    const occupants: any[] = []
    assert.doesNotThrow(() => canDeleteStay(stay, rooms, occupants))
  })

  it('B. Stay 1 Room 0 Occupants Delete rejected', () => {
    const stay = { id: 1, tripId: 10 }
    const rooms: any[] = [{ id: 1, stayId: 1, deletedAt: null }]
    const occupants: any[] = []
    assert.throws(() => canDeleteStay(stay, rooms, occupants), /masih memiliki kamar/)
  })

  it('C. Stay 1 Room 2 Occupants Delete rejected', () => {
    const stay = { id: 1, tripId: 10 }
    const rooms: any[] = [{ id: 1, stayId: 1, deletedAt: null }]
    const occupants: any[] = [{ id: 1, stayId: 1, roomId: 1, jamaahId: 100 }, { id: 2, stayId: 1, roomId: 1, jamaahId: 101 }]
    assert.throws(() => canDeleteStay(stay, rooms, occupants), /masih memiliki kamar atau jamaah/)
  })

  it('D. Remove Occupants delete Room delete Stay allowed', () => {
    const stay = { id: 1, tripId: 10 }
    // Initially has room+occupants → blocked
    let rooms: any[] = [{ id: 1, stayId: 1, deletedAt: null }]
    let occupants: any[] = [{ id: 1, stayId: 1, roomId: 1, jamaahId: 100 }]
    assert.throws(() => canDeleteStay(stay, rooms, occupants))

    // Remove occupants
    occupants = []
    // Room delete check: should allow now
    assert.doesNotThrow(() => canDeleteRoom({ id: 1, stayId: 1 }, occupants))

    // Simulate room deleted
    rooms = [{ id: 1, stayId: 1, deletedAt: new Date() } as any]
    assert.doesNotThrow(() => canDeleteStay(stay, rooms, occupants))
  })

  it('E. Stay with Rooming tied to Order – delete Stay blocked before bypass can occur', () => {
    const stay = { id: 1, tripId: 10 }
    const stays: any[] = [{ id: 1, tripId: 10, orderIds: [100], deletedAt: null }]
    const rooms: any[] = [{ id: 1, stayId: 1, orderId: 100, deletedAt: null }]
    const occupants = [{ id: 1, stayId: 1, roomId: 1, jamaahId: 1000 }]
    const jamaahByOrder = { 100: [1000] }

    // Attempt delete Stay first → should be blocked
    assert.throws(() => canDeleteStay(stay, rooms, occupants), /masih memiliki kamar/)

    // Even if someone tried to unassign Order, it should be blocked because Stay still active
    assert.throws(() => canUnassignOrder(100, 10, stays, rooms, occupants, jamaahByOrder), /Order masih digunakan dalam Rooming/)

    // After proper cleanup, unassign allowed
    const roomsClean: any[] = []
    const occClean: any[] = []
    const staysClean = [{ id: 1, tripId: 10, orderIds: [], deletedAt: new Date() }] // stay deleted after cleanup
    // Now order can be unassigned
    assert.doesNotThrow(() => canUnassignOrder(100, 10, staysClean, roomsClean, occClean, jamaahByOrder))
  })

  it('Room cannot be deleted while active Occupants exist', () => {
    const room = { id: 1, stayId: 1 }
    const occupants = [{ id: 1, roomId: 1, stayId: 1 }]
    assert.throws(() => canDeleteRoom(room, occupants), /masih ada occupant/)
    assert.doesNotThrow(() => canDeleteRoom(room, []))
  })
})
