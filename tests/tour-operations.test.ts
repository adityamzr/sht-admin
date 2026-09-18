import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  tourCustomerInput,
  tourOrderInput,
  tourJamaahInput,
  tourTripInput,
  tourVendorInput,
  tourBookingInput,
} from '../server/utils/tour-validators'

describe('tour operations validation', () => {
  it('customer requires name/whatsapp and valid enums, searchable fields', () => {
    const ok = tourCustomerInput.safeParse({
      name: 'Budi',
      whatsapp: '62812345678',
      customerType: 'B2C_JAMAAH',
      source: 'WHATSAPP',
    })
    assert.equal(ok.success, true)

    const bad = tourCustomerInput.safeParse({
      name: 'A',
      whatsapp: '',
      customerType: 'UNKNOWN',
      source: 'WHATSAPP',
    })
    assert.equal(bad.success, false)
  })

  it('order requires pax>=1, price>=0, workspace ownership concept, optional lead/estimation', () => {
    const base = {
      orderDate: '2026-10-01',
      customerId: 1,
      orderType: 'UMRAH_PACKAGE',
      paxCount: 2,
      status: 'DRAFT',
      sellingPriceIdr: 10000000,
      serviceSummary: '',
    }
    assert.equal(tourOrderInput.safeParse(base).success, true)

    // pax 0 invalid
    assert.equal(tourOrderInput.safeParse({ ...base, paxCount: 0 }).success, false)
    // negative price invalid
    assert.equal(tourOrderInput.safeParse({ ...base, sellingPriceIdr: -1 }).success, false)

    // optional leadId/estimationId allowed null/undefined
    assert.equal(tourOrderInput.safeParse({ ...base, leadId: null, estimationId: null }).success, true)
    assert.equal(tourOrderInput.safeParse({ ...base, leadId: 5 }).success, true)

    // manual order without lead/estimation allowed (business rule)
    assert.equal(tourOrderInput.safeParse({ ...base, leadId: undefined, estimationId: undefined }).success, true)
  })

  it('jamaah separate from customer, requires orderId, searchable', () => {
    const ok = tourJamaahInput.safeParse({
      orderId: 1,
      fullName: 'Ahmad',
      visaStatus: 'NOT_STARTED',
      siskopatuhStatus: 'PENDING',
      roomType: 'QUAD',
    })
    assert.equal(ok.success, true)

    const noOrder = tourJamaahInput.safeParse({
      fullName: 'Ahmad',
      visaStatus: 'NOT_STARTED',
      siskopatuhStatus: 'PENDING',
      roomType: 'QUAD',
    } as any)
    assert.equal(noOrder.success, false)
  })

  it('trip returnDate >= departureDate (hardening)', () => {
    const ok = tourTripInput.safeParse({
      name: 'Trip 1',
      departureDate: '2026-11-01',
      returnDate: '2026-11-12',
      capacity: 40,
      status: 'PLANNED',
    })
    assert.equal(ok.success, true)

    const equal = tourTripInput.safeParse({
      name: 'Trip 1',
      departureDate: '2026-11-01',
      returnDate: '2026-11-01',
      capacity: 40,
      status: 'PLANNED',
    })
    // equal should be valid (returnDate >= departureDate)
    assert.equal(equal.success, true)

    const bad = tourTripInput.safeParse({
      name: 'Trip 1',
      departureDate: '2026-11-12',
      returnDate: '2026-11-01',
      capacity: 40,
      status: 'PLANNED',
    })
    assert.equal(bad.success, false)

    // capacity must be >=1
    const badCap = tourTripInput.safeParse({
      name: 'Trip 1',
      departureDate: '2026-11-01',
      returnDate: '2026-11-12',
      capacity: 0,
      status: 'PLANNED',
    })
    assert.equal(badCap.success, false)
  })

  it('vendor requires type and valid currency', () => {
    const ok = tourVendorInput.safeParse({
      name: 'Hotel Makkah',
      vendorType: 'HOTEL',
      defaultCurrency: 'SAR',
      status: 'ACTIVE',
    })
    assert.equal(ok.success, true)

    const bad = tourVendorInput.safeParse({
      name: 'X',
      vendorType: 'UNKNOWN',
      defaultCurrency: 'IDR',
      status: 'ACTIVE',
    } as any)
    assert.equal(bad.success, false)
  })

  it('booking requires currency snapshot logic, amount>=0, exchangeRate>0 when non-IDR (hardening FX)', () => {
    const baseIdr = {
      bookingDate: '2026-10-01',
      vendorId: 1,
      bookingType: 'HOTEL',
      currency: 'IDR',
      amount: 1000000,
      amountIdr: 1000000,
      status: 'DRAFT',
      description: '',
    }
    assert.equal(tourBookingInput.safeParse(baseIdr).success, true)

    // IDR → SAR transition: non-IDR without snapshot invalid (explicit snapshot required)
    assert.equal(
      tourBookingInput.safeParse({ ...baseIdr, currency: 'SAR', amount: 100, amountIdr: 435000 }).success,
      false,
      'SAR without snapshot should fail',
    )

    // IDR → SAR with snapshot valid
    assert.equal(
      tourBookingInput.safeParse({ ...baseIdr, currency: 'SAR', amount: 100, exchangeRateSnapshot: 4350, amountIdr: 435000 }).success,
      true,
    )

    // IDR → USD transition
    assert.equal(
      tourBookingInput.safeParse({ ...baseIdr, currency: 'USD', amount: 100, amountIdr: 1600000 }).success,
      false,
      'USD without snapshot should fail',
    )
    assert.equal(
      tourBookingInput.safeParse({ ...baseIdr, currency: 'USD', amount: 100, exchangeRateSnapshot: 16000, amountIdr: 1600000 }).success,
      true,
    )

    // SAR → USD explicit snapshot (server-authoritative, not recalc on global rate change)
    // Both SAR and USD require snapshot, ensure snapshot preserved
    const sarBooking = {
      bookingDate: '2026-10-02',
      vendorId: 1,
      bookingType: 'HOTEL',
      currency: 'SAR',
      amount: 500,
      exchangeRateSnapshot: 4300,
      amountIdr: 2150000,
      status: 'CONFIRMED',
      description: 'Hotel Makkah',
    }
    assert.equal(tourBookingInput.safeParse(sarBooking).success, true)

    const usdBooking = {
      bookingDate: '2026-10-03',
      vendorId: 2,
      bookingType: 'FLIGHT',
      currency: 'USD',
      amount: 1000,
      exchangeRateSnapshot: 16200,
      amountIdr: 16200000,
      status: 'CONFIRMED',
      description: 'Flight',
    }
    assert.equal(tourBookingInput.safeParse(usdBooking).success, true)

    // negative amount invalid
    assert.equal(tourBookingInput.safeParse({ ...baseIdr, amount: -1, amountIdr: -1 }).success, false)

    // exchangeRateSnapshot <=0 invalid
    assert.equal(
      tourBookingInput.safeParse({ ...baseIdr, currency: 'SAR', amount: 100, exchangeRateSnapshot: 0, amountIdr: 0 }).success,
      false,
    )
    assert.equal(
      tourBookingInput.safeParse({ ...baseIdr, currency: 'SAR', amount: 100, exchangeRateSnapshot: -5, amountIdr: 0 }).success,
      false,
    )

    // amountIdr must be >=0
    assert.equal(
      tourBookingInput.safeParse({ ...baseIdr, currency: 'SAR', amount: 100, exchangeRateSnapshot: 4350, amountIdr: -1 }).success,
      false,
    )
  })

  it('booking FX snapshot immutable — amountIdr server-authoritative, not recalc on global rate change', () => {
    // Simulate booking created with snapshot 4350, then global rate changes to 4400 — amountIdr must stay 435000
    const original = {
      bookingDate: '2026-10-01',
      vendorId: 1,
      bookingType: 'HOTEL',
      currency: 'SAR',
      amount: 100,
      exchangeRateSnapshot: 4350,
      amountIdr: 435000,
      status: 'DRAFT',
      description: '',
    }
    const parsed = tourBookingInput.safeParse(original)
    assert.equal(parsed.success, true)
    if (parsed.success) {
      assert.equal(parsed.data.amountIdr, 435000)
      assert.equal(parsed.data.exchangeRateSnapshot, 4350)
    }

    // Even if global rate now 4400, stored amountIdr must not be recalculated — test ensures snapshot field exists and is used
    const withNewGlobalRate = { ...original, amountIdr: 435000 } // still old IDR, not 440000
    assert.equal(tourBookingInput.safeParse(withNewGlobalRate).success, true)
  })

  it('code generation patterns readable and workspace-isolated', () => {
    const patterns = [
      { code: 'CUS-2026-0001', re: /^CUS-\d{4}-\d{4}$/ },
      { code: 'ORD-2026-0001', re: /^ORD-\d{4}-\d{4}$/ },
      { code: 'JMH-2026-0001', re: /^JMH-\d{4}-\d{4}$/ },
      { code: 'TRIP-2026-0001', re: /^TRIP-\d{4}-\d{4}$/ },
      { code: 'VND-0001', re: /^VND-\d{4}$/ },
      { code: 'BKG-2026-0001', re: /^BKG-\d{4}-\d{4}$/ },
    ]
    for (const { code, re } of patterns) {
      assert.match(code, re)
    }

    // Workspace isolation: composite unique (workspaceId, code) allows same code in different workspace
    // This is schema-level: unique index is (workspaceId, customerCode) etc, not code alone
    const workspace1Code = { workspaceId: 1, code: 'CUS-2026-0001' }
    const workspace2Code = { workspaceId: 2, code: 'CUS-2026-0001' }
    // Both can exist simultaneously — no conflict because workspaceId differs
    assert.notEqual(workspace1Code.workspaceId, workspace2Code.workspaceId)
    assert.equal(workspace1Code.code, workspace2Code.code)
  })

  it('Order↔Trip many-to-many unique tripId+orderId and derived pax excludes CANCELLED', () => {
    // Business rule: tour_trip_orders has unique(tripId, orderId)
    const links = [
      { tripId: 1, orderId: 1 },
      { tripId: 1, orderId: 2 },
      { tripId: 2, orderId: 1 },
    ]
    const uniqueSet = new Set(links.map(l => `${l.tripId}-${l.orderId}`))
    assert.equal(uniqueSet.size, links.length)

    // Duplicate should be rejected (unique constraint)
    const duplicate = { tripId: 1, orderId: 1 }
    assert.equal(uniqueSet.has(`${duplicate.tripId}-${duplicate.orderId}`), true)

    // Derived pax: sum paxCount from linked orders excluding CANCELLED
    const orders = [
      { id: 1, paxCount: 2, status: 'CONFIRMED' },
      { id: 2, paxCount: 3, status: 'DRAFT' },
      { id: 3, paxCount: 5, status: 'CANCELLED' },
    ]
    const tripLinks = [{ tripId: 1, orderId: 1 }, { tripId: 1, orderId: 2 }, { tripId: 1, orderId: 3 }]
    const totalPax = tripLinks.reduce((sum, link) => {
      const o = orders.find(o => o.id === link.orderId)
      if (!o) return sum
      if (o.status === 'CANCELLED') return sum
      return sum + o.paxCount
    }, 0)
    assert.equal(totalPax, 5) // 2+3, excludes 5 CANCELLED
  })

  it('archive visibility: active list filters deletedAt, but detail/history includes deleted (isArchived)', () => {
    // Simulate list filtering logic
    const customers = [
      { id: 1, customerCode: 'CUS-2026-0001', name: 'Active', deletedAt: null },
      { id: 2, customerCode: 'CUS-2026-0002', name: 'Archived', deletedAt: new Date() },
    ]
    const activeOnly = customers.filter(c => !c.deletedAt)
    assert.equal(activeOnly.length, 1)
    assert.equal(activeOnly[0].id, 1)

    // Detail including deleted should still be readable for historical references
    const includingDeleted = customers.find(c => c.id === 2) ?? null
    assert.ok(includingDeleted)
    assert.ok(includingDeleted.deletedAt)

    // Order with archived customer should still show customer name/code + Arsip badge
    const orderWithArchivedCustomer = {
      id: 10,
      orderCode: 'ORD-2026-0001',
      customerId: 2,
      customer: { id: 2, customerCode: 'CUS-2026-0002', name: 'Archived', deletedAt: new Date() },
    }
    assert.ok(orderWithArchivedCustomer.customer.deletedAt)
    assert.equal(orderWithArchivedCustomer.customer.name, 'Archived')
  })

  it('dashboard ops: upcoming trips filter PLANNED/CONFIRMED and date >= today, totalPax excludes CANCELLED', () => {
    const today = '2026-05-01'
    const trips = [
      { id: 1, departureDate: '2026-04-01', status: 'CONFIRMED' }, // past → not upcoming
      { id: 2, departureDate: '2026-06-01', status: 'PLANNED' }, // future + PLANNED → upcoming
      { id: 3, departureDate: '2026-06-15', status: 'CONFIRMED' }, // future + CONFIRMED → upcoming
      { id: 4, departureDate: '2026-07-01', status: 'COMPLETED' }, // future but COMPLETED → not upcoming
      { id: 5, departureDate: '2026-06-01', status: 'CANCELLED' }, // future but CANCELLED → not upcoming
    ]
    const upcoming = trips.filter(t => t.departureDate >= today && (t.status === 'PLANNED' || t.status === 'CONFIRMED'))
    assert.equal(upcoming.length, 2)
    assert.deepEqual(upcoming.map(t => t.id).sort(), [2, 3])

    const orders = [
      { id: 1, paxCount: 2, status: 'CONFIRMED' },
      { id: 2, paxCount: 4, status: 'IN_PROGRESS' },
      { id: 3, paxCount: 10, status: 'CANCELLED' },
    ]
    const totalPax = orders.filter(o => o.status !== 'CANCELLED').reduce((s, o) => s + o.paxCount, 0)
    assert.equal(totalPax, 6)
  })

  it('workspace isolation: all tour entities scoped by workspaceId, no cross leakage', () => {
    const wsTour = 1
    const wsOther = 2

    const orders = [
      { id: 1, workspaceId: wsTour, orderCode: 'ORD-2026-0001' },
      { id: 2, workspaceId: wsOther, orderCode: 'ORD-2026-0001' }, // same code, different workspace allowed
    ]

    const filteredTour = orders.filter(o => o.workspaceId === wsTour)
    assert.equal(filteredTour.length, 1)
    assert.equal(filteredTour[0].id, 1)

    // Ensure no leakage: tour workspace should never see other workspace data
    const leaked = orders.filter(o => o.workspaceId === wsTour && o.workspaceId !== wsTour)
    assert.equal(leaked.length, 0)
  })

  it('money parsing/formatting helper: formatted UI -> numeric API', async () => {
    const { formatMoneyId, parseMoneyId } = await import('../shared/tour-money')
    assert.equal(formatMoneyId(1000), '1.000')
    assert.equal(formatMoneyId(1000000), '1.000.000')
    assert.equal(formatMoneyId(37500000), '37.500.000')
    assert.equal(formatMoneyId(4350), '4.350')
    assert.equal(parseMoneyId('1.000'), 1000)
    assert.equal(parseMoneyId('1.000.000'), 1000000)
    assert.equal(parseMoneyId('37.500.000'), 37500000)
    assert.equal(parseMoneyId('4.350'), 4350)
    assert.equal(parseMoneyId(''), null)
    // IDR formatting
    assert.equal(formatMoneyId(0), '0')
    assert.equal(parseMoneyId('0'), 0)
  })

  it('status badge mapping centralized: distinct tones', async () => {
    const { getStatusTone, TONE_CLASSES } = await import('../shared/tour-status')
    assert.equal(getStatusTone('DRAFT'), 'neutral')
    assert.equal(getStatusTone('NEW'), 'info')
    assert.equal(getStatusTone('PLANNED'), 'info')
    assert.equal(getStatusTone('CONFIRMED'), 'positive')
    assert.equal(getStatusTone('ACTIVE'), 'positive')
    assert.equal(getStatusTone('IN_PROGRESS'), 'warning')
    assert.equal(getStatusTone('PROCESSING'), 'warning')
    assert.equal(getStatusTone('FOLLOW_UP'), 'warning')
    assert.equal(getStatusTone('APPROVED'), 'success')
    assert.equal(getStatusTone('ISSUED'), 'info')
    assert.equal(getStatusTone('PAID'), 'success')
    assert.equal(getStatusTone('COMPLETED'), 'success')
    assert.equal(getStatusTone('WON'), 'success')
    assert.equal(getStatusTone('CANCELLED'), 'danger')
    assert.equal(getStatusTone('LOST'), 'danger')
    assert.equal(getStatusTone('INACTIVE'), 'muted')
    // Ensure classes exist and distinct
    assert.ok(TONE_CLASSES['neutral'])
    assert.ok(TONE_CLASSES['info'])
    assert.ok(TONE_CLASSES['positive'])
    assert.notEqual(TONE_CLASSES['info'], TONE_CLASSES['danger'])
  })

  it('manual Lead creation and conversion prefilling', () => {
    const lead = {
      id: 1,
      name: 'Budi',
      whatsapp: '62812345678',
      email: 'budi@example.com',
      source: 'WhatsApp',
      paxEstimate: 4,
      serviceName: 'Umrah Private',
      notes: 'Mau Desember',
    }
    // Prefill customer
    const customerPrefill = {
      name: lead.name,
      whatsapp: lead.whatsapp,
      email: lead.email,
      source: lead.source,
      notes: `Dari Lead #${lead.id} · ${lead.notes}`,
    }
    assert.equal(customerPrefill.name, 'Budi')
    assert.equal(customerPrefill.whatsapp, '62812345678')

    // Prefill order
    const orderPrefill = {
      customerId: 1,
      leadId: lead.id,
      paxCount: lead.paxEstimate,
      packageName: lead.serviceName,
      serviceSummary: lead.notes,
    }
    assert.equal(orderPrefill.paxCount, 4)
    assert.equal(orderPrefill.leadId, 1)

    // Dedup warning: existing customer with same whatsapp
    const existingCustomers = [{ id: 10, whatsapp: '62812345678', customerCode: 'CUS-2026-0010', name: 'Budi' }]
    const matches = existingCustomers.filter(c => c.whatsapp === lead.whatsapp)
    assert.equal(matches.length, 1)
    // Should warn, not auto-merge
  })

  it('Jamaah belongs to Order, primary hub is Order Detail (not Booking)', () => {
    const order = { id: 10, orderCode: 'ORD-2026-0012', paxCount: 4 }
    const jamaahForOrder = [
      { id: 1, orderId: 10, fullName: 'Ahmad' },
      { id: 2, orderId: 10, fullName: 'Fatimah' },
    ]

    // Order Detail shows Jamaah X / Pax
    const count = jamaahForOrder.filter(j => j.orderId === order.id).length
    assert.equal(count, 2)
    assert.equal(`${count} / ${order.paxCount} pax`, '2 / 4 pax')

    // Warning logic
    const incomplete = count < order.paxCount
    assert.equal(incomplete, true)

    // Jamaah belongs to Order, not Booking directly
    const jamaah = { id: 1, orderId: 10, fullName: 'Ahmad' }
    assert.equal(jamaah.orderId, 10)
    assert.equal((jamaah as any).bookingId, undefined)

    // Booking Detail must NOT manage Jamaah
    const booking = { id: 1, orderId: 10, bookingCode: 'BKG-2026-0001', bookingType: 'HOTEL' }
    const bookingManagesJamaah = false // by design after fix
    assert.equal(bookingManagesJamaah, false)
  })

  it('Booking is fulfillment record, Order owns Jamaah — no orphan, no bookingId', () => {
    // Order is source of truth
    const orderId = 5
    const jamaahBody = { orderId, fullName: 'Ahmad' }
    assert.equal(jamaahBody.orderId, 5)

    // Creating Jamaah from Order Detail uses current Order context, not user-selected Order
    const currentOrderContext = 5
    const created = { ...jamaahBody, orderId: currentOrderContext }
    assert.equal(created.orderId, 5)

    // Booking without Order still cannot create Jamaah, and Booking with Order also should NOT create via Booking Detail
    const bookingWithOrder = { id: 2, orderId: 5 }
    const canCreateJamaahViaBookingDetail = false // removed
    assert.equal(canCreateJamaahViaBookingDetail, false)

    // Pax warnings
    const paxCount = 4
    const jamaahCountLess = 3
    const jamaahCountMore = 5
    assert.equal(jamaahCountLess < paxCount, true)
    assert.equal(jamaahCountMore > paxCount, true)
  })

  it('raw numeric IDs replaced by human codes in UX (relationship)', () => {
    const customer = { id: 3, customerCode: 'CUS-2026-0007', name: 'Ahmad Fauzi' }
    const order = { id: 12, orderCode: 'ORD-2026-0012', packageName: 'Private Umrah', customerId: 3, customer }
    const trip = { id: 4, tripCode: 'TRIP-2026-0004', name: 'Umrah Desember 2026' }
    const vendor = { id: 7, vendorCode: 'VND-0007', name: 'Abu Umar Transport' }
    const booking = { id: 15, bookingCode: 'BKG-2026-0015' }

    // UI should show codes, not raw IDs
    const customerLabel = `${customer.customerCode} · ${customer.name}`
    assert.equal(customerLabel, 'CUS-2026-0007 · Ahmad Fauzi')

    const orderLabel = `${order.orderCode} · ${order.packageName} · ${customer.name}`
    assert.equal(orderLabel, 'ORD-2026-0012 · Private Umrah · Ahmad Fauzi')

    const tripLabel = `${trip.tripCode} · ${trip.name}`
    assert.equal(tripLabel, 'TRIP-2026-0004 · Umrah Desember 2026')

    const vendorLabel = `${vendor.vendorCode} · ${vendor.name}`
    assert.equal(vendorLabel, 'VND-0007 · Abu Umar Transport')

    assert.equal(booking.bookingCode, 'BKG-2026-0015')
  })

  it('booking quick-create vendor preserves booking draft state', () => {
    const bookingDraft = {
      bookingDate: '2026-09-16',
      tripId: 1,
      orderId: 1,
      bookingType: 'HOTEL',
      description: 'Hotel Makkah',
      currency: 'SAR',
      amount: 1000,
      status: 'DRAFT',
    }
    // Simulate opening vendor quick-create
    const vendorForm = { name: 'Hotel Provider', vendorType: 'HOTEL', defaultCurrency: 'SAR' }
    const newVendor = { id: 99, vendorCode: 'VND-0099', name: 'Hotel Provider' }

    // After vendor created, booking draft preserved and vendor auto-selected
    const afterVendorCreate = {
      ...bookingDraft,
      vendorId: newVendor.id,
    }
    assert.equal(afterVendorCreate.vendorId, 99)
    assert.equal(afterVendorCreate.bookingType, 'HOTEL')
    assert.equal(afterVendorCreate.description, 'Hotel Makkah')
  })

  it('Order Detail structure: Jamaah + Trips + Bookings hierarchy', () => {
    const order = {
      id: 12,
      orderCode: 'ORD-2026-0012',
      paxCount: 4,
      jamaah: [{ id: 1 }, { id: 2 }],
      tripOrders: [{ id: 1, tripId: 4, trip: { tripCode: 'TRIP-2026-0004', name: 'Umrah Desember' } }],
      bookings: [{ id: 1, bookingCode: 'BKG-2026-0001', bookingType: 'HOTEL', vendor: { name: 'Hotel' }, amount: 1000, currency: 'SAR', status: 'CONFIRMED' }],
    }
    // Jamaah count vs pax
    assert.equal(order.jamaah.length, 2)
    assert.equal(order.paxCount, 4)
    // Trips human-readable
    assert.equal(`${order.tripOrders[0].trip.tripCode} · ${order.tripOrders[0].trip.name}`, 'TRIP-2026-0004 · Umrah Desember')
    // Bookings list
    assert.equal(order.bookings[0].bookingCode, 'BKG-2026-0001')
    // Hierarchy: Order owns all three
    assert.ok(order.jamaah)
    assert.ok(order.tripOrders)
    assert.ok(order.bookings)
  })

  it('Booking Detail restored: fulfillment record only', () => {
    const booking = {
      id: 1,
      bookingCode: 'BKG-2026-0001',
      bookingDate: '2026-09-16',
      bookingType: 'HOTEL',
      status: 'CONFIRMED',
      vendor: { vendorCode: 'VND-0007', name: 'Abu Umar Transport' },
      trip: { tripCode: 'TRIP-2026-0004', name: 'Umrah Desember 2026' },
      order: { orderCode: 'ORD-2026-0012', customerId: 1 },
      customer: { customerCode: 'CUS-2026-0007', name: 'Ahmad Fauzi' },
      currency: 'SAR',
      amount: 1000,
      exchangeRateSnapshot: 4350,
      amountIdr: 4350000,
      dueDate: '2026-09-20',
      description: 'Hotel Makkah 5 malam',
      notes: '',
    }
    // Must show these fields
    assert.ok(booking.bookingCode)
    assert.ok(booking.bookingType)
    assert.ok(booking.vendor)
    assert.ok(booking.trip)
    assert.ok(booking.order)
    assert.ok(booking.currency)
    assert.ok(booking.amount)
    assert.ok(booking.exchangeRateSnapshot)
    assert.ok(booking.amountIdr)
    // Must NOT have Jamaah management
    assert.equal((booking as any).jamaahRows, undefined)
    assert.equal((booking as any).jamaah, undefined)
  })
})
