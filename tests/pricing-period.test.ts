import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolvePricingPeriod } from '../server/services/pricing'

const periods = [
  { name: 'Normal', startDate: '2024-01-01', endDate: '2030-12-31', priority: 0, isActive: true },
  { name: 'High Season', startDate: '2026-12-15', endDate: '2027-01-15', priority: 10, isActive: true },
  { name: 'Ramadan', startDate: '2027-02-08', endDate: '2027-03-10', priority:20, isActive: true },
]

describe('pricing period resolution (highest priority wins)', () => {
  it('tanggal biasa → Normal', () => {
    const p = resolvePricingPeriod(periods, '2026-08-22')
    assert.equal(p?.name, 'Normal')
  })
  it('overlap High Season & Normal → High Season (prioritas tertinggi)', () => {
    const p = resolvePricingPeriod(periods, '2026-12-20')
    assert.equal(p?.name, 'High Season')
  })
  it('overlap Ramadan & Normal → Ramadan', () => {
    const p = resolvePricingPeriod(periods, '2027-02-20')
    assert.equal(p?.name, 'Ramadan')
  })
  it('periode nonaktif diabaikan', () => {
    const p = resolvePricingPeriod(
      [...periods, { name: 'Spesial', startDate: '2026-08-01', endDate: '2026-08-31', priority: 99, isActive: false }],
      '2026-08-22',
    )
    assert.equal(p?.name, 'Normal')
  })
  it('di luar semua periode → null', () => {
    const p = resolvePricingPeriod(periods, '2031-05-01')
    assert.equal(p, null)
  })
})
