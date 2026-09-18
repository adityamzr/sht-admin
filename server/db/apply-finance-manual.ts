/**
 * Manual apply finance tables – bypass drizzle __drizzle_migrations check.
 * Usage: npx tsx server/db/apply-finance-manual.ts
 * Reads NUXT_DATABASE_URL or DATABASE_URL from .env
 */
import './env'
import postgres from 'postgres'
import fs from 'node:fs'
import path from 'node:path'

const url = process.env.NUXT_DATABASE_URL || process.env.DATABASE_URL
if (!url) {
  console.error('NUXT_DATABASE_URL / DATABASE_URL not set')
  process.exit(1)
}
const sql = postgres(url, { max: 1 })

async function main() {
  const file = path.join(process.cwd(), 'server/db/migrations/0021_tour_finance_phase2.sql')
  const raw = fs.readFileSync(file, 'utf8')
  // split by statement-breakpoint marker used by drizzle-kit
  const statements = raw.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean)
  console.log(`Found ${statements.length} statements in 0021`)
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    try {
      await sql.unsafe(stmt)
      console.log(`✔ [${i+1}/${statements.length}] OK: ${stmt.slice(0,80).replace(/\n/g,' ')}...`)
    } catch (e: any) {
      // ignore already exists errors
      if (e.code === '42P07' || e.code === '42P06' || e.message?.includes('already exists')) {
        console.log(`⚠ [${i+1}/${statements.length}] already exists, skip: ${stmt.slice(0,60)}`)
      } else {
        console.error(`✖ [${i+1}/${statements.length}] FAIL: ${e.message}`)
        console.error(e)
        // continue anyway
      }
    }
  }

  // Also ensure 0020 lead manual fields
  const file20 = path.join(process.cwd(), 'server/db/migrations/0020_lead_manual_fields.sql')
  if (fs.existsSync(file20)) {
    const raw20 = fs.readFileSync(file20, 'utf8')
    const stmts20 = raw20.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean)
    for (const stmt of stmts20) {
      try { await sql.unsafe(stmt); console.log(`✔ 0020 OK: ${stmt.slice(0,60)}`) } 
      catch (e:any) { if (e.code==='42701' || e.message?.includes('already exists')) console.log(`⚠ 0020 already exists`); else console.error(`✖ 0020 FAIL ${e.message}`) }
    }
  }

  // Verify tables exist
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('tour_invoices','tour_payments','tour_expenses')`
  console.log('Existing finance tables:', tables.map((t:any)=>t.table_name))

  await sql.end()
  console.log('Done – now restart nuxt dev')
}

main()
