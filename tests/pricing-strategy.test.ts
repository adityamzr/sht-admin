import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { calculateSellingPrice } from '../server/services/pricing'

describe('pricing strategy calculations', () => {
  it('manual selling price', () => {
    assert.equal(
      calculateSellingPrice({ strategy: 'manual', supplierCost: null, markupType: null, markupValue: null, sellingPrice: 17500000 }),
      17500000,
    )
  })
  it('supplier cost + fixed markup', () => {
    assert.equal(
      calculateSellingPrice({ strategy: 'cost_plus_fixed', supplierCost: 15200000, markupType: 'fixed', markupValue: 1000000, sellingPrice: null }),
      16200000,
    )
  })
  it('supplier cost + percentage markup', () => {
    assert.equal(
      calculateSellingPrice({ strategy: 'cost_plus_percentage', supplierCost: 12500000, markupType: 'percentage', markupValue: 18.4, sellingPrice: null }),
      14800000,
    )
  })
  it('manual tanpa sellingPrice → error', () => {
    assert.throws(() =>
      calculateSellingPrice({ strategy: 'manual', supplierCost: null, markupType: null, markupValue: null, sellingPrice: null }),
    )
  })
  it('cost_plus tanpa supplierCost → error', () => {
    assert.throws(() =>
      calculateSellingPrice({ strategy: 'cost_plus_fixed', supplierCost: null, markupType: 'fixed', markupValue: 1000000, sellingPrice: null }),
    )
  })
})
