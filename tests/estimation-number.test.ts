import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { estimationNumberForSequence } from '../server/services/estimation'

describe('estimation number', () => {
  it('format EST-000123', () => {
    assert.equal(estimationNumberForSequence(123), 'EST-000123')
    assert.equal(estimationNumberForSequence(1), 'EST-000001')
    assert.equal(estimationNumberForSequence(999999), 'EST-999999')
  })
  it('unik & monoton untuk rentang besar', () => {
    const seen = new Set<string>()
    for (let i = 1; i <= 100000; i++) {
      const n = estimationNumberForSequence(i)
      assert.equal(seen.has(n), false)
      seen.add(n)
    }
  })
})
