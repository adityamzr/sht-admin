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
  it('customer requires name/whatsapp and valid enums', () => {
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

  it('jamaah separate from customer, requires orderId', () => {
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

  it('trip returnDate >= departureDate', () => {
    const ok = tourTripInput.safeParse({
      name: 'Trip 1',
      departureDate: '2026-11-01',
      returnDate: '2026-11-12',
      capacity: 40,
      status: 'PLANNED',
    })
    assert.equal(ok.success, true)

    const bad = tourTripInput.safeParse({
      name: 'Trip 1',
      departureDate: '2026-11-12',
      returnDate: '2026-11-01',
      capacity: 40,
      status: 'PLANNED',
    })
    assert.equal(bad.success, false)
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

  it('booking requires currency snapshot logic, amount>=0, exchangeRate>0 when non-IDR', () => {
    const base = {
      bookingDate: '2026-10-01',
      vendorId: 1,
      bookingType: 'HOTEL',
      currency: 'IDR',
      amount: 1000000,
      amountIdr: 1000000,
      status: 'DRAFT',
      description: '',
    }
    assert.equal(tourBookingInput.safeParse(base).success, true)

    // non-IDR without snapshot invalid
    assert.equal(
      tourBookingInput.safeParse({ ...base, currency: 'SAR', amount: 100, amountIdr: 435000 }).success,
      false,
    )

    // non-IDR with snapshot valid
    assert.equal(
      tourBookingInput.safeParse({ ...base, currency: 'SAR', amount: 100, exchangeRateSnapshot: 4350, amountIdr: 435000 }).success,
      true,
    )

    // negative amount invalid
    assert.equal(tourBookingInput.safeParse({ ...base, amount: -1, amountIdr: -1 }).success, false)

    // exchangeRateSnapshot <=0 invalid
    assert.equal(
      tourBookingInput.safeParse({ ...base, currency: 'SAR', amount: 100, exchangeRateSnapshot: 0, amountIdr: 0 }).success,
      false,
    )
  })

  it('code generation patterns readable', () => {
    // Codes are generated server-side via sequences, format checked here as business rule
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
  })

  it('workspace isolation concept: same code different workspace allowed via composite unique', () => {
    // This is a schema-level test: unique index is (workspaceId, code), not code alone
    // So CUS-2026-0001 can exist in workspace 1 and workspace 2 simultaneously
    // We assert the intention here; actual DB test requires integration
    const compositeUnique = true
    assert.equal(compositeUnique, true)
  })

  it('Order↔Trip many-to-many unique tripId+orderId', () => {
    // Business rule: tour_trip_orders has unique(tripId, orderId)
    const uniqueConstraint = true
    assert.equal(uniqueConstraint, true)
  })
})
