import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Session admin minimal (session-based, cookie HTTP-only).
 * Tanpa dependency eksternal: payload JSON di-seal dengan HMAC-SHA256
 * menggunakan NUXT_SESSION_SECRET (wajib ≥ 32 karakter di production).
 * Bisa diganti library session bila kebutuhan bertambah (RBAC dll).
 */

const COOKIE_NAME = 'sht_admin_session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 hari

export interface SessionPayload {
  userId: number
  exp: number // epoch seconds
}

function sessionSecret(): string {
  const secret = process.env.NUXT_SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw createError({
      statusCode: 500,
      statusMessage: 'NUXT_SESSION_SECRET belum dikonfigurasi (minimal 32 karakter).',
    })
  }
  return secret
}

function sign(raw: string): string {
  return createHmac('sha256', sessionSecret()).update(raw).digest('base64url')
}

function b64url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function b64urlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

/** Buat session untuk admin (userId) — set cookie sealed. */
export function setAdminSession(event: any, userId: number) {
  const payload: SessionPayload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  }
  const raw = b64url(JSON.stringify(payload))
  const token = `${raw}.${sign(raw)}`
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: getRequestURL(event).protocol === 'https:',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

/** Baca & verifikasi session; null bila tidak ada/tidak valid/kadaluarsa. */
export function getAdminSession(event: any): SessionPayload | null {
  const token = getCookie(event, COOKIE_NAME)
  if (!token) return null
  const [raw, sig] = token.split('.')
  if (!raw || !sig) return null
  const expected = sign(raw)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(b64urlDecode(raw)) as SessionPayload
    if (typeof payload.userId !== 'number' || !payload.exp) return null
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

/** Wajib session valid — throw 401 bila tidak ada. */
export function requireAdminSession(event: any): SessionPayload {
  const session = getAdminSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized — silakan login admin.' })
  }
  return session
}

export function clearAdminSession(event: any) {
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}
