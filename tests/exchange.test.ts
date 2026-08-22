import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { convertAmount, pickActiveRate, toIdr } from '../server/services/pricing'

const rates = [
  { sourceCurrency: 'USD', targetCurrency: 'IDR', rate: '16200', isActive: true, effectiveAt: new Date('2026-08-01') },
  { sourceCurrency: 'USD', targetCurrency: 'IDR', rate: '16500', isActive: true, effectiveAt: new Date('2026-08-20') },
  { sourceCurrency: 'USD', targetCurrency: 'IDR', rate: '99999', isActive: false, effectiveAt: new Date('2026-08-21') },
  { sourceCurrency: 'SAR', targetCurrency: 'IDR', rate: '4350', isActive: true, effectiveAt: new Date('2026-08-01') },
]

describe('currency conversion', () => {
  it('konversi dasar', () => {
    assert.equal(convertAmount(100, 4350), 435000)
  })
  it('toIdr dibulatkan tanpa desimal', () => {
    assert.equal(toIdr(165, 16200), 2673000)
  })
  it('pickActiveRate memilih kurs aktif terbaru per pasangan', () => {
    const r = pickActiveRate(rates, 'USD', 'IDR')
    assert.equal(r?.rate, 16500)
  })
  it('kurs nonaktif diabaikan', () => {
    const sar = pickActiveRate(rates, 'SAR', 'IDR')
    assert.equal(sar?.rate, 4350)
  })
  it('pasangan tidak ada → null', () => {
    assert.equal(pickActiveRate(rates, 'EUR', 'IDR'), null)
  })
})
