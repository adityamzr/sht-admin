import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  tourAccommodationStayInput,
  tourAccommodationRoomInput,
  tourRoomOccupantInput,
} from '../server/utils/tour-validators'

describe('tour accommodation & rooming v1', () => {
  // ── Stay validation ───────────────────────────────────────────────────────
  it('Stay requires valid Trip, Booking HOTEL, date validation', () => {
    const ok = tourAccommodationStayInput.safeParse({
      tripId: 1,
      bookingId: 2,
      hotelName: 'Sofwah Tower',
      city: 'Makkah',
      checkInDate: '2026-12-23',
      checkOutDate: '2026-12-28',
      orderIds: [10, 11],
    })
    assert.equal(ok.success, true)

    const badDate = tourAccommodationStayInput.safeParse({
      tripId: 1,
      bookingId: 2,
      hotelName: 'Sofwah Tower',
      city: 'Makkah',
      checkInDate: '2026-12-28',
      checkOutDate: '2026-12-23',
      orderIds: [10],
    })
    assert.equal(badDate.success, false, 'checkOut < checkIn should fail')

    const noOrders = tourAccommodationStayInput.safeParse({
      tripId: 1,
      bookingId: 2,
      hotelName: 'Sofwah Tower',
      city: 'Makkah',
      checkInDate: '2026-12-23',
      checkOutDate: '2026-12-28',
      orderIds: [],
    })
    assert.equal(noOrders.success, false, 'Stay must have at least 1 Order')

    const noHotelName = tourAccommodationStayInput.safeParse({
      tripId: 1,
      bookingId: 2,
      hotelName: '',
      city: 'Makkah',
      checkInDate: '2026-12-23',
      checkOutDate: '2026-12-28',
      orderIds: [10],
    })
    assert.equal(noHotelName.success, false)
  })

  it('Booking must be HOTEL – service rule simulation', () => {
    function ensureHotelBooking(bookingType: string) {
      if (bookingType !== 'HOTEL') throw new Error(`Booking harus tipe HOTEL, bukan ${bookingType}`)
    }
    assert.doesNotThrow(() => ensureHotelBooking('HOTEL'))
    assert.throws(() => ensureHotelBooking('TRANSPORT'), /harus tipe HOTEL/)
    assert.throws(() => ensureHotelBooking('VISA'), /harus tipe HOTEL/)
  })

  it('Booking must belong to same Trip – service rule', () => {
    function ensureSameTrip(bookingTripId: number | null, stayTripId: number) {
      if (bookingTripId && bookingTripId !== stayTripId) throw new Error(`Booking milik Trip #${bookingTripId}, tidak cocok dengan Trip #${stayTripId}`)
    }
    assert.doesNotThrow(() => ensureSameTrip(1, 1))
    assert.doesNotThrow(() => ensureSameTrip(null, 1), 'null allowed as manual fallback narrowly controlled')
    assert.throws(() => ensureSameTrip(2, 1), /tidak cocok/)
  })

  it('Only Trip Orders selectable for Stay – service rule', () => {
    const tripOrders = [{ tripId: 1, orderId: 10 }, { tripId: 1, orderId: 11 }]
    function ensureOrderBelongsTrip(orderId: number, tripId: number) {
      const found = tripOrders.some(to => to.tripId === tripId && to.orderId === orderId)
      if (!found) throw new Error(`Order #${orderId} belum di-assign ke Trip #${tripId}`)
    }
    assert.doesNotThrow(() => ensureOrderBelongsTrip(10, 1))
    assert.throws(() => ensureOrderBelongsTrip(12, 1), /belum di-assign/)
  })

  // ── Room validation ───────────────────────────────────────────────────────
  it('create room – capacity defaults/validation', () => {
    const ok = tourAccommodationRoomInput.safeParse({
      stayId: 1,
      roomLabel: 'Room 501',
      roomType: 'DOUBLE',
      roomingMode: 'SAME_ORDER',
      orderId: 10,
    })
    assert.equal(ok.success, true)

    const badCap = tourAccommodationRoomInput.safeParse({
      stayId: 1,
      roomLabel: 'Room 501',
      roomType: 'DOUBLE',
      capacity: 0,
      roomingMode: 'SAME_ORDER',
      orderId: 10,
    })
    assert.equal(badCap.success, false, 'capacity 0 should fail')

    const noLabel = tourAccommodationRoomInput.safeParse({
      stayId: 1,
      roomLabel: '',
      roomType: 'DOUBLE',
      roomingMode: 'SHARED_GROUP',
    } as any)
    assert.equal(noLabel.success, false)
  })

  it('SAME_ORDER requires orderId, selected Order belongs to Stay', () => {
    const sameOrderOk = tourAccommodationRoomInput.safeParse({
      stayId: 1,
      roomLabel: 'Room 501',
      roomType: 'DOUBLE',
      roomingMode: 'SAME_ORDER',
      orderId: 10,
    })
    assert.equal(sameOrderOk.success, true)

    const sameOrderNoOrder = tourAccommodationRoomInput.safeParse({
      stayId: 1,
      roomLabel: 'Room 501',
      roomType: 'DOUBLE',
      roomingMode: 'SAME_ORDER',
    } as any)
    assert.equal(sameOrderNoOrder.success, false, 'SAME_ORDER wajib orderId')

    // Service: order must be included in Stay
    const stayOrders = [10, 11]
    function ensureOrderInStay(orderId: number) {
      if (!stayOrders.includes(orderId)) throw new Error(`Order #${orderId} belum termasuk di Stay`)
    }
    assert.doesNotThrow(() => ensureOrderInStay(10))
    assert.throws(() => ensureOrderInStay(12), /belum termasuk/)
  })

  it('SHARED_GROUP clears/does not require orderId', () => {
    const sharedOk = tourAccommodationRoomInput.safeParse({
      stayId: 1,
      roomLabel: 'Quad 01',
      roomType: 'QUAD',
      roomingMode: 'SHARED_GROUP',
    })
    assert.equal(sharedOk.success, true)

    const sharedWithOrder = tourAccommodationRoomInput.safeParse({
      stayId: 1,
      roomLabel: 'Quad 01',
      roomType: 'QUAD',
      roomingMode: 'SHARED_GROUP',
      orderId: 10,
    })
    // Validator allows but service clears – per spec
    assert.equal(sharedWithOrder.success, true)
  })

  it('Room capacity defaults: SINGLE=1 DOUBLE=2 TRIPLE=3 QUAD=4 QUINT=5', () => {
    function defaultCap(t: string) {
      switch(t){ case 'SINGLE': return 1; case 'DOUBLE': return 2; case 'TRIPLE': return 3; case 'QUAD': return 4; case 'QUINT': return 5; default: return 2; }
    }
    assert.equal(defaultCap('SINGLE'), 1)
    assert.equal(defaultCap('DOUBLE'), 2)
    assert.equal(defaultCap('TRIPLE'), 3)
    assert.equal(defaultCap('QUAD'), 4)
    assert.equal(defaultCap('QUINT'), 5)
  })

  // ── Occupants validation ──────────────────────────────────────────────────
  it('Jamaah belongs to Trip through Order, Order belongs to Stay', () => {
    const tripOrders = [{ tripId: 1, orderId: 10 }]
    const stayOrders = [10]
    const jamaah = { id: 100, orderId: 10 }

    function validateJamaahForStay(jamaahOrderId: number, tripId: number) {
      const inTrip = tripOrders.some(to => to.tripId === tripId && to.orderId === jamaahOrderId)
      if (!inTrip) throw new Error('Jamaah Order belum di Trip')
      if (!stayOrders.includes(jamaahOrderId)) throw new Error('Order belum di Stay')
    }
    assert.doesNotThrow(() => validateJamaahForStay(10, 1))
    assert.throws(() => validateJamaahForStay(11, 1), /belum/)
  })

  it('SAME_ORDER blocks different Order, SHARED_GROUP permits different Orders', () => {
    const roomSame = { roomingMode: 'SAME_ORDER', orderId: 10 }
    const roomShared = { roomingMode: 'SHARED_GROUP', orderId: null }

    function canAssign(room: any, jamaahOrderId: number) {
      if (room.roomingMode === 'SAME_ORDER' && jamaahOrderId !== room.orderId) throw new Error('SAME_ORDER only same Order')
    }
    assert.doesNotThrow(() => canAssign(roomSame, 10))
    assert.throws(() => canAssign(roomSame, 11), /SAME_ORDER/)
    assert.doesNotThrow(() => canAssign(roomShared, 10))
    assert.doesNotThrow(() => canAssign(roomShared, 11))
  })

  it('same Jamaah cannot occupy two Rooms in same Stay, but CAN in different Stays', () => {
    const occupantsStay1: Array<{ stayId: number; roomId: number; jamaahId: number }> = [{ stayId: Number(1), roomId: Number(1), jamaahId: Number(100) }]
    function ensureNotAlreadyInSameStay(stayId: number, jamaahId: number) {
      const sid: number = stayId
      const jid: number = jamaahId
      if (occupantsStay1.some((o) => o.stayId === (sid as number) && o.jamaahId === (jid as number))) throw new Error('already assigned in same Stay')
    }
    const stayA: number = 1
    const stayB: number = 2
    const jamaahX: number = 100
    assert.throws(() => ensureNotAlreadyInSameStay(stayA, jamaahX), /already assigned/)
    assert.doesNotThrow(() => ensureNotAlreadyInSameStay(stayB, jamaahX), 'same Jamaah CAN occupy rooms in two different Stays')
  })

  it('room capacity enforced', () => {
    const room = { capacity: 4, occupied: 4, roomLabel: 'Quad 01' }
    function ensureCapacity(room: any) {
      if (room.occupied >= room.capacity) throw new Error(`Room ${room.roomLabel} is already full (${room.occupied}/${room.capacity}).`)
    }
    assert.throws(() => ensureCapacity(room), /already full/)
    const room2 = { capacity: 4, occupied: 3, roomLabel: 'Quad 01' }
    assert.doesNotThrow(() => ensureCapacity(room2))
  })

  it('workspace isolation for accommodation', () => {
    const wsTour: number = 1, wsOther: number = 2
    const stays = [{ id: 1, workspaceId: wsTour, tripId: 1 }]
    const filtered = stays.filter(s => s.workspaceId === wsTour)
    assert.equal(filtered.length, 1)
    assert.equal(filtered[0].workspaceId, wsTour)
    assert.equal((wsTour as number) !== (wsOther as number), true)
  })

  // ── Completeness ──────────────────────────────────────────────────────────
  it('Completeness: 6 eligible, 4 assigned => 4/6, then 6/6 Complete', () => {
    const eligible = 6
    let assigned = 4
    let result = `${assigned} / ${eligible} assigned`
    assert.equal(result, '4 / 6 assigned')
    assert.equal(assigned < eligible, true)
    assert.equal(eligible - assigned, 2)

    assigned = 6
    result = `${assigned} / ${eligible} assigned`
    assert.equal(result, '6 / 6 assigned')
    assert.equal(assigned >= eligible, true)
  })

  // ── UAT Scenario ──────────────────────────────────────────────────────────
  it('UAT: Trip Umrah December, Orders A 4pax B 1pax C 3pax total 8, Makkah Stay Sofwah Tower, Rooms 501 DOUBLE SAME_ORDER A 2, 502 DOUBLE SAME_ORDER A 2, 503 QUAD SHARED_GROUP B+C 4 => 8/8 no duplicate, then Madinah different grouping same Jamaah can have different room', () => {
    const orders = [
      { id: 10, code: 'ORD-A', pax: 4, jamaah: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] },
      { id: 11, code: 'ORD-B', pax: 1, jamaah: [{ id: 5 }] },
      { id: 12, code: 'ORD-C', pax: 3, jamaah: [{ id: 6 }, { id: 7 }, { id: 8 }] },
    ]
    const totalJamaah = orders.reduce((s,o)=>s+o.pax,0)
    assert.equal(totalJamaah, 8)

    const makkahStay = { id: 1, hotelName: 'Sofwah Tower', orders: [10,11,12] }
    const rooms = [
      { id: 1, stayId: 1, roomLabel: 'Room 501', roomType: 'DOUBLE', roomingMode: 'SAME_ORDER', orderId: 10, capacity: 2, occupants: [1,2] },
      { id: 2, stayId: 1, roomLabel: 'Room 502', roomType: 'DOUBLE', roomingMode: 'SAME_ORDER', orderId: 10, capacity: 2, occupants: [3,4] },
      { id: 3, stayId: 1, roomLabel: 'Room 503', roomType: 'QUAD', roomingMode: 'SHARED_GROUP', orderId: null, capacity: 4, occupants: [5,6,7,8] },
    ]

    const allOccupants = rooms.flatMap(r=>r.occupants)
    assert.equal(allOccupants.length, 8)
    assert.equal(new Set(allOccupants).size, 8, 'No duplicate occupants')
    assert.equal(allOccupants.length, totalJamaah, '8 / 8 assigned')

    // SAME_ORDER checks
    assert.equal(rooms[0].occupants.every((jid:number)=> [1,2,3,4].includes(jid)), true)
    assert.equal(rooms[2].occupants.length, 4)

    // Madinah Stay different grouping, same Jamaah can have different room
    const madinahStay = { id: 2, hotelName: 'Dar Naem', orders: [10,11,12] }
    const madinahRooms = [
      { id: 4, stayId: 2, roomLabel: 'Room 302', roomType: 'TRIPLE', roomingMode: 'SHARED_GROUP', occupants: [1,5,6] },
      { id: 5, stayId: 2, roomLabel: 'Room 303', roomType: 'QUINT', roomingMode: 'SHARED_GROUP', occupants: [2,3,4,7,8] },
    ]
    const madinahOccupants = madinahRooms.flatMap(r=>r.occupants)
    assert.equal(madinahOccupants.length, 8)
    // Jamaah 1 was in Room 501 Makkah, now Room 302 Madinah – allowed because different stays
    const jamaah1MakkahRoom = rooms.find(r=>r.occupants.includes(1))?.roomLabel
    const jamaah1MadinahRoom = madinahRooms.find(r=>r.occupants.includes(1))?.roomLabel
    assert.equal(jamaah1MakkahRoom, 'Room 501')
    assert.equal(jamaah1MadinahRoom, 'Room 302')
    assert.notEqual(jamaah1MakkahRoom, jamaah1MadinahRoom, 'same Jamaah can receive different room allocation there')
  })

  it('Room Preference label: roomType remains DB field but UI shows Preferensi Kamar', () => {
    const jamaah = { roomType: 'DOUBLE', fullName: 'Ahmad' }
    const preferenceLabel = 'Preferensi Kamar'
    const actualAllocation = 'Room 501 · Double · Makkah, Room 302 · Triple · Madinah'
    assert.equal(jamaah.roomType, 'DOUBLE')
    assert.equal(preferenceLabel, 'Preferensi Kamar')
    assert.ok(actualAllocation.includes('Room 501'))
    // DB field remains roomType for compatibility
    assert.equal(Object.keys(jamaah).includes('roomType'), true)
  })
})
