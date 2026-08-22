/**
 * CORS untuk API PUBLIK (/api/v1) — dipanggil dari sht-web (origin beda).
 * - Origins yang diizinkan dari env CORS_ALLOWED_ORIGINS (koma).
 * - Default development: http://localhost:3000 dan http://127.0.0.1:3000.
 * - TIDAK pakai `*` — hanya origin customer yang diizinkan.
 * - Tidak menyentuh /api/admin (admin = same-origin, dilindungi session cookie).
 */
const DEV_ORIGINS = 'http://localhost:3000,http://127.0.0.1:3000'

function allowedOrigins(): string[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS || DEV_ORIGINS
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export default defineEventHandler((event) => {
  if (!event.path.startsWith('/api/v1')) return

  const origin = getRequestHeader(event, 'origin')
  const allowed = allowedOrigins()
  const isAllowed = Boolean(origin && allowed.includes(origin))

  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': isAllowed && origin ? origin : allowed[0] ?? '',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  })

  if (event.method === 'OPTIONS') {
    setResponseStatus(event, 204)
    return null
  }
})
