<script setup lang="ts">
import {
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  Landmark,
  PackageCheck,
  PlaneTakeoff,
  ReceiptText,
  RefreshCw,
  TriangleAlert,
  Users,
} from 'lucide-vue-next'
import type { TourOperationalDashboard } from '~/types'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { data, pending, error, refresh } = await useAdminFetch<{ data: TourOperationalDashboard }>('/api/admin/tour/summary')
const dashboard = computed(() => data.value?.data ?? null)
const refreshing = ref(false)

const kpiCards = computed(() => {
  const kpis = dashboard.value?.kpis
  if (!kpis) return []
  return [
    { label: 'Pesanan Aktif', value: String(kpis.activeOrders), hint: 'Terkonfirmasi & berjalan', to: '/tour/orders', icon: PackageCheck, tone: 'olive' },
    { label: 'Pax Aktif', value: String(kpis.activePax), hint: 'Dari pesanan aktif', to: '/tour/orders', icon: Users, tone: 'olive' },
    { label: 'Trip Mendatang', value: String(kpis.upcomingTrips), hint: 'Planned & confirmed', to: '/tour/trips', icon: PlaneTakeoff, tone: 'neutral' },
    { label: 'Piutang Berjalan', value: formatIdr(kpis.outstandingReceivables), hint: 'Invoice terbit belum lunas', to: '/tour/finance/invoices', icon: ReceiptText, tone: 'warning' },
    { label: 'Invoice Overdue', value: String(kpis.overdueInvoices), hint: 'Perlu ditindaklanjuti', to: '/tour/finance/invoices', icon: TriangleAlert, tone: kpis.overdueInvoices > 0 ? 'danger' : 'neutral' },
    { label: 'Posisi Kas', value: formatIdr(kpis.currentCashPosition), hint: 'Payment - expense terverifikasi', to: '/tour/finance', icon: Landmark, tone: kpis.currentCashPosition < 0 ? 'danger' : 'positive' },
  ]
})

const errorMessage = computed(() => {
  const value = error.value as any
  return value?.data?.statusMessage || value?.statusMessage || value?.message || 'Dashboard Tour gagal dimuat.'
})

function formatIdr(value: number) {
  const amount = Number(value || 0)
  const sign = amount < 0 ? '-' : ''
  return `${sign}Rp ${Math.abs(amount).toLocaleString('id-ID')}`
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

function departureLabel(days: number) {
  if (days === 0) return 'Berangkat hari ini'
  if (days === 1) return 'Besok'
  return `${days} hari lagi`
}

function roomingLabel(trip: TourOperationalDashboard['upcomingTrips'][number]) {
  if (!trip.rooming.configured) return 'Belum dikonfigurasi'
  if (trip.rooming.eligible === 0) return 'Belum ada jamaah eligible'
  return `${trip.rooming.assigned} / ${trip.rooming.eligible} teralokasi`
}

function orderTitle(order: TourOperationalDashboard['recentOrders'][number]) {
  return order.packageName || order.serviceSummary || order.orderType.replaceAll('_', ' ')
}

async function reload() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    await refresh()
  } finally {
    refreshing.value = false
  }
}
</script>

<template>
  <div>
    <PageHead title="Dashboard" subtitle="Ringkasan operasional harian Sudut Haramain Tour">
      <template #actions>
        <button class="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-neutral-line bg-white px-4 py-2 text-sm font-semibold transition hover:border-sht-olive/40 hover:bg-neutral-warm disabled:cursor-not-allowed disabled:opacity-60" :disabled="refreshing" @click="reload">
          <RefreshCw class="h-4 w-4" :class="refreshing ? 'animate-spin' : ''" />
          {{ refreshing ? 'Memuat...' : 'Refresh' }}
        </button>
      </template>
    </PageHead>

    <div v-if="pending" class="mt-6 space-y-6" aria-label="Memuat dashboard Tour">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div v-for="n in 6" :key="n" class="h-32 animate-pulse rounded-2xl border border-neutral-line bg-white p-5">
          <div class="h-3 w-28 rounded bg-neutral-warm" />
          <div class="mt-5 h-7 w-36 rounded bg-neutral-warm" />
          <div class="mt-3 h-3 w-24 rounded bg-neutral-warm" />
        </div>
      </div>
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,1fr)]">
        <AdminTableSkeleton :rows="4" :columns="3" />
        <AdminTableSkeleton :rows="4" :columns="2" />
      </div>
    </div>

    <div v-else-if="error || !dashboard" class="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">
      <p class="font-semibold text-red-800">Dashboard belum dapat dimuat.</p>
      <p class="mt-1 text-sm text-red-700">{{ errorMessage }}</p>
      <button class="mt-4 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white" @click="reload">Coba lagi</button>
    </div>

    <div v-else class="mt-6 space-y-8">
      <section aria-labelledby="dashboard-kpi-title">
        <h2 id="dashboard-kpi-title" class="sr-only">Indikator operasional utama</h2>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <NuxtLink v-for="card in kpiCards" :key="card.label" :to="card.to" class="group rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5 hover:border-sht-olive/30 hover:shadow-sm" :class="card.tone === 'danger' ? 'border-red-200' : card.tone === 'warning' ? 'border-amber-200' : card.tone === 'positive' ? 'border-emerald-200' : 'border-neutral-line'">
            <div class="flex items-start justify-between gap-3">
              <span class="rounded-xl p-2.5" :class="card.tone === 'danger' ? 'bg-red-50 text-red-700' : card.tone === 'warning' ? 'bg-amber-50 text-amber-700' : card.tone === 'positive' ? 'bg-emerald-50 text-emerald-700' : card.tone === 'olive' ? 'bg-sht-olive/10 text-sht-olive' : 'bg-neutral-warm text-neutral-charcoal/70'">
                <component :is="card.icon" class="h-5 w-5" />
              </span>
              <ArrowUpRight class="h-4 w-4 text-neutral-charcoal/30 transition group-hover:text-sht-olive" />
            </div>
            <p class="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/55">{{ card.label }}</p>
            <p class="mt-1 font-heading text-2xl font-semibold" :class="card.tone === 'danger' ? 'text-red-700' : card.tone === 'warning' ? 'text-amber-700' : card.tone === 'positive' ? 'text-emerald-700' : 'text-neutral-charcoal'">{{ card.value }}</p>
            <p class="mt-1 text-xs text-neutral-charcoal/55">{{ card.hint }}</p>
          </NuxtLink>
        </div>
      </section>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,1fr)]">
        <section class="rounded-2xl border border-neutral-line bg-white p-5 sm:p-6" aria-labelledby="upcoming-trips-title">
          <div class="flex items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <CalendarDays class="h-5 w-5 text-sht-olive" />
                <h2 id="upcoming-trips-title" class="font-heading text-lg font-semibold">Trip Mendatang</h2>
              </div>
              <p class="mt-1 text-sm text-neutral-charcoal/55">Keberangkatan terdekat yang sedang dipersiapkan.</p>
            </div>
            <NuxtLink to="/tour/trips" class="shrink-0 text-xs font-semibold text-brand-teal hover:underline">Lihat semua →</NuxtLink>
          </div>

          <div v-if="dashboard.upcomingTrips.length" class="mt-5 divide-y divide-neutral-line">
            <NuxtLink v-for="trip in dashboard.upcomingTrips" :key="trip.id" :to="trip.to" class="group grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1.35fr)_minmax(11rem,.8fr)_auto] sm:items-center">
              <div class="min-w-0">
                <p class="font-mono text-xs font-semibold text-sht-olive">{{ trip.tripCode }}</p>
                <p class="mt-1 truncate font-semibold group-hover:text-sht-olive">{{ trip.name }}</p>
                <p class="mt-1 text-xs text-neutral-charcoal/55">{{ formatDate(trip.departureDate) }} · {{ departureLabel(trip.daysUntilDeparture) }}</p>
              </div>
              <div class="grid grid-cols-2 gap-3 text-xs sm:block sm:space-y-1">
                <p><span class="text-neutral-charcoal/50">Pax</span> <strong>{{ trip.totalPax }} / {{ trip.capacity }}</strong></p>
                <p><span class="text-neutral-charcoal/50">Pesanan</span> <strong>{{ trip.ordersCount }}</strong></p>
                <p class="col-span-2"><span class="text-neutral-charcoal/50">Rooming</span> <strong>{{ roomingLabel(trip) }}</strong></p>
              </div>
              <div class="flex items-center justify-between gap-3 sm:justify-end">
                <TourStatusBadge :status="trip.status" type="trip" />
                <ArrowUpRight class="h-4 w-4 text-neutral-charcoal/30 group-hover:text-sht-olive" />
              </div>
            </NuxtLink>
          </div>
          <p v-else class="mt-5 rounded-xl bg-neutral-warm px-4 py-5 text-sm text-neutral-charcoal/55">Belum ada trip mendatang.</p>
        </section>

        <section class="rounded-2xl border border-neutral-line bg-white p-5 sm:p-6" aria-labelledby="attention-title">
          <div class="flex items-center gap-2">
            <TriangleAlert class="h-5 w-5 text-amber-600" />
            <h2 id="attention-title" class="font-heading text-lg font-semibold">Perlu Perhatian</h2>
          </div>
          <p class="mt-1 text-sm text-neutral-charcoal/55">Item paling mendesak untuk ditindaklanjuti.</p>

          <div v-if="dashboard.attention.length" class="mt-5 space-y-3">
            <NuxtLink v-for="item in dashboard.attention" :key="item.id" :to="item.to" class="group block rounded-xl border px-4 py-3 transition hover:shadow-sm" :class="item.tone === 'danger' ? 'border-red-100 bg-red-50/60' : item.tone === 'warning' ? 'border-amber-100 bg-amber-50/60' : 'border-sky-100 bg-sky-50/50'">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold">{{ item.title }}</p>
                  <p class="mt-0.5 text-xs text-neutral-charcoal/65">{{ item.description }}</p>
                  <p class="mt-1 text-xs font-medium" :class="item.tone === 'danger' ? 'text-red-700' : item.tone === 'warning' ? 'text-amber-700' : 'text-sky-700'">{{ item.meta }}</p>
                </div>
                <ArrowUpRight class="mt-0.5 h-4 w-4 shrink-0 text-neutral-charcoal/30 group-hover:text-sht-olive" />
              </div>
            </NuxtLink>
          </div>
          <p v-else class="mt-5 rounded-xl bg-emerald-50 px-4 py-5 text-sm text-emerald-800">Tidak ada item mendesak saat ini.</p>
        </section>
      </div>

      <section class="rounded-2xl border border-neutral-line bg-white p-5 sm:p-6" aria-labelledby="recent-orders-title">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 id="recent-orders-title" class="font-heading text-lg font-semibold">Pesanan Terbaru</h2>
            <p class="mt-1 text-sm text-neutral-charcoal/55">Pesanan yang paling baru dicatat.</p>
          </div>
          <NuxtLink to="/tour/orders" class="shrink-0 text-xs font-semibold text-brand-teal hover:underline">Lihat semua →</NuxtLink>
        </div>

        <div v-if="dashboard.recentOrders.length" class="mt-5 grid gap-3 lg:grid-cols-2">
          <NuxtLink v-for="order in dashboard.recentOrders" :key="order.id" :to="`/tour/orders/${order.id}`" class="group rounded-xl border border-neutral-line p-4 transition hover:border-sht-olive/30 hover:bg-neutral-warm/50">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-mono text-xs font-semibold text-sht-olive">{{ order.orderCode }}</p>
                <p class="mt-1 truncate font-semibold">{{ orderTitle(order) }}</p>
                <p class="mt-1 text-xs text-neutral-charcoal/55">{{ order.customerName || 'Pelanggan belum tersedia' }} · {{ formatDate(order.orderDate) }}</p>
              </div>
              <ArrowUpRight class="h-4 w-4 shrink-0 text-neutral-charcoal/30 group-hover:text-sht-olive" />
            </div>
            <div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <p><span class="text-neutral-charcoal/50">{{ order.paxCount }} pax</span> · <strong>{{ formatIdr(order.sellingPriceIdr) }}</strong></p>
              <TourStatusBadge :status="order.status" type="order" />
            </div>
          </NuxtLink>
        </div>
        <p v-else class="mt-5 rounded-xl bg-neutral-warm px-4 py-5 text-sm text-neutral-charcoal/55">Belum ada pesanan terbaru.</p>
      </section>

      <section class="rounded-2xl border border-neutral-line bg-white p-5 sm:p-6" aria-labelledby="finance-activity-title">
        <div class="flex items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2">
              <CircleDollarSign class="h-5 w-5 text-sht-olive" />
              <h2 id="finance-activity-title" class="font-heading text-lg font-semibold">Aktivitas Keuangan Terbaru</h2>
            </div>
            <p class="mt-1 text-sm text-neutral-charcoal/55">Hanya payment dan expense terverifikasi.</p>
          </div>
          <NuxtLink to="/tour/finance" class="shrink-0 text-xs font-semibold text-brand-teal hover:underline">Finance →</NuxtLink>
        </div>

        <div v-if="dashboard.financeActivity.length" class="mt-5 divide-y divide-neutral-line">
          <NuxtLink v-for="activity in dashboard.financeActivity" :key="activity.id" :to="activity.to" class="group flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="rounded-full px-2 py-0.5 text-[10px] font-bold" :class="activity.type === 'PAYMENT' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'">{{ activity.type === 'PAYMENT' ? 'MASUK' : 'KELUAR' }}</span>
                <p class="truncate font-mono text-xs font-semibold">{{ activity.code }}</p>
              </div>
              <p class="mt-1 truncate text-sm text-neutral-charcoal/70">{{ activity.context }}</p>
              <p class="mt-0.5 text-xs text-neutral-charcoal/45">{{ formatDate(activity.date) }}</p>
            </div>
            <div class="shrink-0 text-right">
              <p class="font-semibold" :class="activity.type === 'PAYMENT' ? 'text-emerald-700' : 'text-amber-700'">{{ activity.type === 'PAYMENT' ? '+' : '−' }} {{ formatIdr(activity.amountIdr) }}</p>
              <p v-if="activity.originalAmount && activity.originalCurrency" class="mt-0.5 text-xs text-neutral-charcoal/45">{{ activity.originalCurrency }} {{ activity.originalAmount.toLocaleString('id-ID') }}</p>
            </div>
          </NuxtLink>
        </div>
        <p v-else class="mt-5 rounded-xl bg-neutral-warm px-4 py-5 text-sm text-neutral-charcoal/55">Belum ada aktivitas keuangan terverifikasi.</p>
      </section>
    </div>
  </div>
</template>
