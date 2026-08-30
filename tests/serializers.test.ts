import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { publicDepartureCity, publicFlight, publicHotel, publicService, publicTransportation } from '../server/utils/serializers'

describe('public serializers — tidak pernah membocorkan data internal', () => {
  it('publicHotel hanya berisi field publik', () => {
    const out = publicHotel(
      { id: 1, name: 'Swissôtel', city: 'Makkah', starRating: 5, distanceLabel: '±250 m', description: 'desc', coverImage: '/x.jpg', gallery: [], isActive: true, sortOrder: 1 },
      [{ roomType: { id: 2, hotelId: 1, name: 'Quad', capacity: 4, isActive: true, sortOrder: 1 }, price: { sellingPrice: 4500000, currency: 'IDR', sellingPriceIdr: 4500000 } }],
    )
    assert.deepEqual(Object.keys(out).sort(), ['city', 'coverImage', 'description', 'distanceLabel', 'id', 'name', 'roomTypes', 'starRating'])
    assert.deepEqual(Object.keys(out.roomTypes[0]).sort(), ['capacity', 'currency', 'id', 'name', 'pricePerNight', 'pricePerNightIdr'])
  })
  it('publicFlight tidak memuat supplierCost/markup', () => {
    const out = publicFlight(
      { id: 3, airline: 'Qatar', routeLabel: 'CGK → JED', origin: 'CGK', destination: 'JED', flightType: 'Transit', baggage: '30kg', isActive: true, sortOrder: 1 },
      { sellingPrice: 14800000, currency: 'IDR', sellingPriceIdr: 14800000 },
    )
    assert.equal(JSON.stringify(out).includes('supplier'), false)
    assert.equal(JSON.stringify(out).includes('markup'), false)
    assert.equal(JSON.stringify(out).includes('internalNotes'), false)
  })
  it('publicService hanya field publik', () => {
    const out = publicService(
      { id: 1, code: 'visa', name: 'Visa Umroh', description: 'd', category: 'core_journey', pricingUnit: 'pax', inTripBuilder: true, standalone: true, image: '/i.jpg', isActive: true, sortOrder: 1 },
      { sellingPrice: 3100000, currency: 'IDR', sellingPriceIdr: 3100000 },
    )
    assert.deepEqual(Object.keys(out).sort(), ['category', 'code', 'currency', 'description', 'id', 'name', 'price', 'priceIdr', 'pricingUnit'])
  })
  it('publicDepartureCity & publicTransportation tidak bocor internal', () => {
    const city = publicDepartureCity(
      { id: 1, code: 'bandung', name: 'Bandung', feePerPax: '650000', feeCurrency: 'IDR', isActive: true, sortOrder: 1 },
      650000,
    )
    const transport = publicTransportation(
      { id: 1, name: 'Rute A', pickup: 'JED', destination: 'Makkah', description: '', isActive: true, sortOrder: 1 },
      [
        {
          option: { id: 1, routeId: 1, vehicleId: 1, isActive: true },
          vehicle: { id: 1, name: 'HiAce', capacity: 12, luggageLabel: 'x', description: '', image: '', isActive: true, sortOrder: 1 },
          price: { sellingPrice: 1250000, currency: 'IDR', sellingPriceIdr: 1250000 },
        },
      ],
    )
    const json = JSON.stringify({ city, transport })
    for (const forbidden of ['supplier', 'markup', 'internalNotes', 'cost']) {
      assert.equal(json.includes(forbidden), false)
    }
  })
})
