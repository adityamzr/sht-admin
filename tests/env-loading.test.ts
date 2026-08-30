import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * REGRESI M2.1 — env loading CLI:
 * skrip standalone (tsx) harus memuat root .env otomatis;
 * tanpa konfigurasi → exit non-zero dengan pesan jelas (tanpa kredensial).
 */

const ROOT = process.cwd()
const ENV_PATH = join(ROOT, '.env')
const TEST_ENV = 'NUXT_DATABASE_URL="postgresql://cli:test@localhost:5432/cli_test"\n'

function cleanShellEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env }
  delete env.NUXT_DATABASE_URL
  delete env.DATABASE_URL
  delete env.ADMIN_EMAIL
  delete env.ADMIN_PASSWORD
  return env
}

function runTsxEval(code: string) {
  return spawnSync('npx', ['tsx', '-e', code], {
    cwd: ROOT,
    env: cleanShellEnv(),
    encoding: 'utf8',
    timeout: 60_000,
  })
}

describe('CLI env loading (M2.1)', () => {
  it('skrip standalone memuat root .env otomatis (tanpa export shell)', () => {
    const backup = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8') : null
    writeFileSync(ENV_PATH, TEST_ENV)
    try {
      const res = runTsxEval(`
        import { getDbUrl } from './server/db/env'
        ;(async () => { console.log('URL_OK=' + String(getDbUrl().startsWith('postgresql://'))) })()
      `)
      assert.equal(res.status, 0, res.stderr)
      assert.match(res.stdout, /URL_OK=true/)
    } finally {
      if (backup !== null) writeFileSync(ENV_PATH, backup)
      else rmSync(ENV_PATH, { force: true })
    }
  })

  it('tanpa .env dan tanpa env var → gagal jelas, exit non-zero', () => {
    const backup = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8') : null
    rmSync(ENV_PATH, { force: true })
    try {
      const res = runTsxEval(`
        import { getDbUrl } from './server/db/env'
        ;(async () => { getDbUrl() })()
      `)
      assert.notEqual(res.status, 0)
      const output = `${res.stdout}${res.stderr}`
      assert.match(output, /NUXT_DATABASE_URL/)
      assert.match(output, /\.env/)
      // tidak boleh mencetak kredensial/connection string
      assert.doesNotMatch(output, /postgresql:\/\/.*:.*@/)
    } finally {
      if (backup !== null) writeFileSync(ENV_PATH, backup)
    }
  })

  it('DATABASE_URL tetap diterima sebagai fallback kompatibilitas', () => {
    const backup = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8') : null
    writeFileSync(ENV_PATH, 'DATABASE_URL="postgresql://legacy:test@localhost:5432/legacy_test"\n')
    try {
      const res = runTsxEval(`
        import { getDbUrl } from './server/db/env'
        ;(async () => { console.log('URL_OK=' + String(getDbUrl().startsWith('postgresql://'))) })()
      `)
      assert.equal(res.status, 0, res.stderr)
      assert.match(res.stdout, /URL_OK=true/)
    } finally {
      if (backup !== null) writeFileSync(ENV_PATH, backup)
      else rmSync(ENV_PATH, { force: true })
    }
  })
})
