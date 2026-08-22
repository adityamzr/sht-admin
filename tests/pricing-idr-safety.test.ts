import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { convertToIdrOrNull } from '../server/services/pricing'
import { publicFlight, publicService } from '../server/utils/serializers'

/**
 * REGRESI M2.1 — fail-closed konversi non-IDR:
 * angka non-IDR (SAR/USD) TIDAK PERNAH direpresentasikan sebagai IDR
 * tanpa kurs eksplisit (100 SAR ≠ 100 IDR).
 */
describe('pricing IDR conversion — fail-closed (M2.1)', () => {
  it('1. harga IDR tidak butuh kurs → nilai normal', () => {
    assert.equal(convertToIdrOrNull(4500000, 'IDR', null), 4500000)
    assert.equal(convertToIdrOrNull(17500000, 'IDR', undefined), 17500000)
  })

  it('2. harga SAR + kurs SAR→IDR aktif → konversi benar', () => {
    assert.equal(convertToIdrOrNull(100, 'SAR', 4350), 435000)
    assert.equal(convertToIdrOrNull(350.5, 'SAR', 4350), 1524675)
  })

  it('3. harga USD + kurs USD→IDR aktif → konversi benar', () => {
    assert.equal(convertToIdrOrNull(165, 'USD', 16200), 2673000)
  })

  it('4. harga non-IDR TANPA kurs → null, TIDAK PERNAH 1:1', () => {
    assert.equal(convertToIdrOrNull(100, 'SAR', null), null)
    assert.equal(convertToIdrOrNull(100, 'SAR', undefined), null)
    assert.equal(convertToIdrOrNull(165, 'USD', null), null)
    // kurs tidak valid juga fail-closed
    assert.equal(convertToIdrOrNull(100, 'SAR', 0), null)
    assert.equal(convertToIdrOrNull(100, 'SAR', -1), null)
    // invariant: hasil tidak boleh sama dengan angka sumber
    const out = convertToIdrOrNull(100, 'SAR', null)
    assert.notEqual(out, 100)
  })

  it('5. serialisasi publik tidak menampilkan angka sumber sebagai IDR saat kurs hilang', () => {
    const flight = publicFlight(
      { id: 1, airline: 'Saudia', routeLabel: 'CGK → JED', origin: 'CGK', destination: 'JED', flightType: 'Direct', baggage: '30kg', isActive: true, sortOrder: 1 },
      { sellingPrice: 100, currency: 'SAR', sellingPriceIdr: null },
    )
    assert.equal(flight.pricePerPax, 100) // harga sumber + mata uang tetap jujur
    assert.equal(flight.currency, 'SAR')
    assert.equal(flight.pricePerPaxIdr, null) // IDR = tidak tersedia, bukan 100

    const service = publicService(
      { id: 2, code: 'muthawwif', name: 'Muthawwif', description: 'd', category: 'assisted', pricingUnit: 'group_session', inTripBuilder: true, standalone: true, image: '', isActive: true, sortOrder: 1 },
      { sellingPrice: 400, currency: 'USD', sellingPriceIdr: null },
    )
    assert.equal(service.price, 400)
    assert.equal(service.currency, 'USD')
    assert.equal(service.priceIdr, null)

    // response publik tidak boleh memuat angka sumber di field IDR
    const json = JSON.stringify({ flight, service })
    assert.equal(json.includes('"pricePerPaxIdr":100'), false)
    assert.equal(json.includes('"priceIdr":400'), false)
    assert.equal(json.includes('"pricePerPaxIdr":null'), true)
  })
})
