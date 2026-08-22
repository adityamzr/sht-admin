import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { hashPassword, verifyPassword } from '../server/services/auth'

describe('password hashing (scrypt)', () => {
  it('roundtrip valid', async () => {
    const hash = await hashPassword('s3cret-password!')
    assert.equal(await verifyPassword('s3cret-password!', hash), true)
  })
  it('password salah ditolak', async () => {
    const hash = await hashPassword('s3cret-password!')
    assert.equal(await verifyPassword('wrong', hash), false)
  })
  it('hash rusak tidak crash', async () => {
    assert.equal(await verifyPassword('x', 'bukan-hash-valid'), false)
  })
})
