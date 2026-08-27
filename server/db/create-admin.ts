/**
 * Buat akun admin production (satu-off, dijalankan manual oleh owner/devops):
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME=... npm run admin:create
 * Tidak ada password production yang di-commit; credential diberikan via env.
 * Idempotent: bila email sudah ada, hanya update nama & status aktif.
 */
import { and, eq } from 'drizzle-orm'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'
import { hashPassword } from '../services/auth'
import { getDbUrl } from './env'

const DATABASE_URL = getDbUrl()
const emailEnv = process.env.ADMIN_EMAIL
const passwordEnv = process.env.ADMIN_PASSWORD
const name = process.env.ADMIN_NAME || 'Admin SHT'

if (!emailEnv || !passwordEnv) {
  console.error('Wajib: ADMIN_EMAIL dan ADMIN_PASSWORD (min. 12 karakter) — bisa diisi di file .env.')
  process.exit(1)
}
if (passwordEnv.length < 12) {
  console.error('ADMIN_PASSWORD minimal 12 karakter.')
  process.exit(1)
}
const email = emailEnv
const password = passwordEnv

const client = postgres(DATABASE_URL, { ssl: /neon\.tech|sslmode=require/.test(DATABASE_URL) ? 'require' : false, max: 5, prepare: false })
const db = drizzle(client, { schema })

async function main() {
  let userId: number
  const existing = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.email, email.toLowerCase().trim())).limit(1)
  if (existing.length) {
    await db
      .update(schema.adminUsers)
      .set({ name, isActive: true, updatedAt: new Date() })
      .where(eq(schema.adminUsers.id, existing[0].id))
    userId = existing[0].id
    console.log(`✔ Admin ${email} sudah ada — nama & status aktif diperbarui (password tidak diubah).`)
  } else {
    const [created] = await db.insert(schema.adminUsers).values({
      email: email.toLowerCase().trim(),
      name,
      passwordHash: await hashPassword(password),
      isActive: true,
    }).returning({ id: schema.adminUsers.id })
    userId = created.id
    console.log(`✔ Admin ${email} dibuat.`)
  }

  // Admin production baru mendapat akses awal ke workspace sistem yang tersedia.
  for (const seed of [
    { key: 'media', name: 'Sudut Haramain Media', description: 'Mengelola sudutharamain.id' },
    { key: 'tour', name: 'Sudut Haramain Tour', description: 'Mengelola tour.sudutharamain.id' },
  ]) {
    const rows = await db.select().from(schema.workspaces).where(eq(schema.workspaces.key, seed.key)).limit(1)
    const workspace = rows[0] ?? (await db.insert(schema.workspaces).values({ ...seed, isActive: true }).returning())[0]
    const membership = await db.select({ id: schema.workspaceMemberships.id }).from(schema.workspaceMemberships).where(and(eq(schema.workspaceMemberships.userId, userId), eq(schema.workspaceMemberships.workspaceId, workspace.id))).limit(1)
    if (!membership[0]) await db.insert(schema.workspaceMemberships).values({ userId, workspaceId: workspace.id, role: 'ADMIN' })
  }
  await client.end()
}

main().catch((err) => {
  console.error('❌ Gagal:', err)
  process.exit(1)
})
