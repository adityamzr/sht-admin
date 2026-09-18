import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  ACTIVE_ORDER_STATUSES,
  TOUR_DASHBOARD_LIMITS,
  UPCOMING_TRIP_STATUSES,
  addTourDays,
  tourDaysBetween,
} from '../shared/tour-dashboard'

const root = resolve(import.meta.dirname, '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('Tour Dashboard Operational V1.1', () => {
  it('locks operational KPI status definitions without changing domain enums', () => {
    assert.deepEqual([...ACTIVE_ORDER_STATUSES], ['CONFIRMED', 'IN_PROGRESS'])
    assert.deepEqual([...UPCOMING_TRIP_STATUSES], ['PLANNED', 'CONFIRMED'])
  })

  it('uses date-only UTC math for upcoming and overdue labels', () => {
    assert.equal(addTourDays('2026-12-30', 3), '2027-01-02')
    assert.equal(tourDaysBetween('2026-12-20', '2027-01-02'), 13)
    assert.equal(tourDaysBetween('2026-12-20', '2026-12-20'), 0)
  })

  it('keeps dashboard lists intentionally bounded', () => {
    assert.deepEqual(TOUR_DASHBOARD_LIMITS, {
      upcomingTrips: 5,
      attention: 8,
      recentOrders: 5,
      financeActivity: 8,
    })
  })

  it('uses a Tour-scoped server service and reuses hardened Finance overview', () => {
    const api = read('server/api/admin/tour/summary.get.ts')
    const service = read('server/services/tour-dashboard.ts')

    assert.match(api, /getTourWorkspaceId\(db\)/)
    assert.match(api, /getTourOperationalDashboard\(db, workspaceId\)/)
    assert.match(service, /getFinanceOverview\(db, workspaceId\)/)
    assert.match(service, /eq\(tourOrders\.workspaceId, workspaceId\)/)
    assert.match(service, /eq\(tourTrips\.workspaceId, workspaceId\)/)
    assert.match(service, /eq\(tourPayments\.workspaceId, workspaceId\)/)
    assert.match(service, /eq\(tourExpenses\.workspaceId, workspaceId\)/)
  })

  it('keeps Finance overview database-driven and bounded without changing formulas', () => {
    const finance = read('server/services/tour-finance.ts')

    assert.match(finance, /coalesce\(sum\(\$\{tourPayments\.amountIdr\}\), 0\)/)
    assert.match(finance, /coalesce\(sum\(\$\{tourExpenses\.amountIdr\}\), 0\)/)
    assert.match(finance, /eq\(tourInvoices\.state, 'ISSUED'\)/)
    assert.match(finance, /eq\(tourPayments\.status, 'VERIFIED'\)/)
    assert.match(finance, /eq\(tourExpenses\.status, 'VERIFIED'\)/)
    assert.match(finance, /groupBy\(tourInvoices\.id\)/)
    assert.match(finance, /limit\(5\)/)
    assert.match(finance, /currentCashPosition = cashReceived - verifiedExpenses/)
  })

  it('derives active pax, upcoming trips, verified activity, and incomplete jamaah from live tables', () => {
    const service = read('server/services/tour-dashboard.ts')

    assert.match(service, /coalesce\(sum\(\$\{tourOrders\.paxCount\}\), 0\)/)
    assert.match(service, /gte\(tourTrips\.departureDate, today/)
    assert.match(service, /ne\(tourOrders\.status, 'CANCELLED'\)/)
    assert.match(service, /eq\(tourPayments\.status, 'VERIFIED'\)/)
    assert.match(service, /eq\(tourExpenses\.status, 'VERIFIED'\)/)
    assert.match(service, /having\(sql`count\(\$\{tourJamaah\.id\}\) < \$\{tourOrders\.paxCount\}`\)/)
  })

  it('sorts and limits actionable operational sections on the server', () => {
    const service = read('server/services/tour-dashboard.ts')

    assert.match(service, /orderBy\(asc\(tourTrips\.departureDate\), asc\(tourTrips\.id\)\)/)
    assert.match(service, /limit\(TOUR_DASHBOARD_LIMITS\.upcomingTrips\)/)
    assert.match(service, /orderBy\(desc\(tourOrders\.createdAt\), desc\(tourOrders\.id\)\)/)
    assert.match(service, /attention\.sort\(/)
    assert.match(service, /slice\(0, TOUR_DASHBOARD_LIMITS\.attention\)/)
  })

  it('derives rooming only when a Stay exists and does not persist readiness', () => {
    const service = read('server/services/tour-dashboard.ts')
    const schema = read('server/db/schema.ts')

    assert.match(service, /configured: false/)
    assert.match(service, /tourAccommodationStays/)
    assert.match(service, /tourRoomOccupants/)
    assert.doesNotMatch(schema, /tripReadiness|trip_readiness/)
  })

  it('renders operational sections, loading/error states, and removes legacy dashboard copy', () => {
    const page = read('pages/tour/index.vue')

    assert.match(page, /\/api\/admin\/tour\/summary/)
    assert.match(page, /Pesanan Aktif/)
    assert.match(page, /Pax Aktif/)
    assert.match(page, /Trip Mendatang/)
    assert.match(page, /Perlu Perhatian/)
    assert.match(page, /Pesanan Terbaru/)
    assert.match(page, /Aktivitas Keuangan Terbaru/)
    assert.match(page, /v-if="pending"/)
    assert.match(page, /v-else-if="error \|\| !dashboard"/)
    assert.doesNotMatch(page, /Alur Kerja/)
    assert.doesNotMatch(page, /Estimasi Tersimpan|Produk Aktif|Total Pelanggan|Total Pesanan/)
  })

  it('keeps optional failures graceful and empty states compact', () => {
    const service = read('server/services/tour-dashboard.ts')
    const page = read('pages/tour/index.vue')

    assert.match(service, /warnings\.push\('ROOMING_UNAVAILABLE'\)/)
    assert.match(service, /warnings\.push\('FINANCE_ACTIVITY_UNAVAILABLE'\)/)
    assert.match(page, /Belum ada trip mendatang\./)
    assert.match(page, /Tidak ada item mendesak saat ini\./)
    assert.match(page, /Belum ada pesanan terbaru\./)
    assert.match(page, /Belum ada aktivitas keuangan terverifikasi\./)
  })
})
