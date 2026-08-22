import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { pricingRecordInput, pricingPeriodInput, exchangeRateInput, leadStatusPatch } from '../server/utils/validators'

const baseRecord = {
  entityType: 'flight', entityId: 1, periodId: 1, currency: 'IDR', pricingUnit: 'pax',
  strategy: 'manual', supplierCost: null, markupType: null, markupValue: null,
  sellingPrice: 1000, internalNotes: null, isActive: true,
}

describe('server-side validation', () => {
  it('pricing record manual wajib sellingPrice', () => {
    const res = pricingRecordInput.safeParse({ ...baseRecord, sellingPrice: null })
    assert.equal(res.success, false)
  })
  it('pricing record cost_plus wajib supplierCost + markup', () => {
    const res = pricingRecordInput.safeParse({ ...baseRecord, strategy: 'cost_plus_percentage', sellingPrice: null })
    assert.equal(res.success, false)
  })
  it('unit tidak sesuai tipe entitas ditolak', () => {
    const res = pricingRecordInput.safeParse({ ...baseRecord, entityType: 'flight', pricingUnit: 'room_night' })
    assert.equal(res.success, false)
  })
  it('enum tidak dikenal ditolak', () => {
    const res = pricingRecordInput.safeParse({ ...baseRecord, strategy: 'unknown' })
    assert.equal(res.success, false)
  })
  it('periode: endDate < startDate ditolak', () => {
    const res = pricingPeriodInput.safeParse({ name: 'Periode Salah', startDate: '2027-01-15', endDate: '2027-01-01', priority: 5, isActive: true })
    assert.equal(res.success, false)
  })
  it('periode valid diterima (date dinormalisasi ISO)', () => {
    const res = pricingPeriodInput.safeParse({ name: 'Periode OK', startDate: '2027-01-01', endDate: '2027-01-15', priority: 5, isActive: true })
    assert.equal(res.success, true)
    if (res.success) assert.equal(res.data.startDate, '2027-01-01')
  })
  it('kurs <= 0 ditolak', () => {
    const res = exchangeRateInput.safeParse({ sourceCurrency: 'USD', targetCurrency: 'IDR', rate: 0 })
    assert.equal(res.success, false)
  })
  it('kurs mata uang sama ditolak', () => {
    const res = exchangeRateInput.safeParse({ sourceCurrency: 'USD', targetCurrency: 'USD', rate: 1 })
    assert.equal(res.success, false)
  })
  it('lead status enum', () => {
    assert.equal(leadStatusPatch.safeParse({ status: 'NEW' }).success, true)
    assert.equal(leadStatusPatch.safeParse({ status: 'GOLD' }).success, false)
  })
})
