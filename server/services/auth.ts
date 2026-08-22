import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { eq } from 'drizzle-orm'
import { adminUsers } from '../db/schema'
import type { Db } from '../db'

/**
 * Password admin: scrypt (node:crypto, tanpa dependency native).
 * Format tersimpan: scrypt$N$r$p$salt(base64)$hash(base64)
 */
const scrypt = promisify(_scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>

const N = 16384
const r = 8
const p = 1
const KEYLEN = 64

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const hash = (await scrypt(password, salt, KEYLEN)) as Buffer
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${hash.toString('base64')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, n, rr, pp, saltB64, hashB64] = stored.split('$')
    if (scheme !== 'scrypt') return false
    const salt = Buffer.from(saltB64, 'base64')
    const expected = Buffer.from(hashB64, 'base64')
    const actual = (await scrypt(password, salt, Number(KEYLEN))) as Buffer
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

export interface AuthAdmin {
  id: number
  email: string
  name: string
  isActive: boolean
}

export async function findAdminByEmail(db: Db, email: string) {
  const rows = await db.select().from(adminUsers).where(eq(adminUsers.email, email.toLowerCase().trim())).limit(1)
  return rows[0] ?? null
}

/** Autentikasi email+password; null bila gagal/nonaktif. */
export async function authenticateAdmin(db: Db, email: string, password: string) {
  const user = await findAdminByEmail(db, email)
  if (!user || !user.isActive) return null
  const ok = await verifyPassword(password, user.passwordHash)
  if (!ok) return null
  return user
}

export function publicAdmin(user: { id: number; email: string; name: string; isActive: boolean }): AuthAdmin {
  return { id: user.id, email: user.email, name: user.name, isActive: user.isActive }
}
