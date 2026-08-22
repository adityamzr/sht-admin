<script setup lang="ts">
import type { AdminSummary } from '~/types'
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { data: health } = await useAdminFetch<{ status: string }>('/api/health')
const { data: summary } = await useAdminFetch<AdminSummary>('/api/admin/summary')

const stats = computed(() => [
  { label: 'Leads Baru', value: String(summary.value?.newLeads ?? '—'), hint: 'status NEW' },
  { label: 'Total Leads', value: String(summary.value?.totalLeads ?? '—'), hint: 'semua status' },
  { label: 'Estimasi Tersimpan', value: String(summary.value?.totalEstimations ?? '—'), hint: 'snapshot historis' },
  { label: 'Produk Aktif', value: String(summary.value?.activeProducts ?? '—'), hint: 'hotel + flight + service + kendaraan' },
])

const checklist = [
  { text: 'M0 — Architecture Cleanup & Baseline', done: true },
  { text: 'M1 — Product Blueprint (intents, terminologi, scope, konversi)', done: true },
  { text: 'M2 — Backend Foundation (schema, auth, katalog, pricing, leads)', done: true },
  { text: 'M3 — Domain Model & Database (estimator end-to-end)', done: false },
  { text: 'M4 — Pricing Engine (strategi, periode, kurs, snapshot)', done: false },
  { text: 'M5 — Core Admin Operations (workflow produk & leads)', done: false },
  { text: 'M6 — Public API Layer (kontrak stabil sht-web)', done: false },
  { text: 'M7 — Customer Integration & Trip Builder (ganti mock ke API)', done: false },
  { text: 'M8 — Estimation, Lead & Consultation (EST-ID + WhatsApp)', done: false },
  { text: 'M9 — Individual Services + Content Platform', done: false },
  { text: 'M10 — UX/UI, Quality & Production Readiness', done: false },
]
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="font-heading text-2xl font-semibold">Dashboard</h1>
        <p class="mt-1 text-sm text-neutral-charcoal/60">Selamat datang — panel operasional Sudut Haramain Tour.</p>
      </div>
      <span
        class="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold"
        :class="health?.status === 'ok' ? 'border-brand-green/30 bg-brand-green/5 text-brand-green' : 'border-gold-soft bg-gold-sand/50 text-neutral-charcoal/70'"
      >
        <span class="h-2 w-2 rounded-full" :class="health?.status === 'ok' ? 'bg-brand-green' : 'bg-gold'" />
        API: {{ health?.status === 'ok' ? 'sehat' : 'belum terhubung' }}
      </span>
    </div>

    <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard v-for="s in stats" :key="s.label" :label="s.label" :value="s.value" :hint="s.hint" />
    </div>

    <div class="mt-8 rounded-2xl border border-neutral-line bg-white p-6">
      <h2 class="font-heading text-lg font-semibold">Roadmap milestone</h2>
      <p class="mt-1 text-sm text-neutral-charcoal/60">Roadmap master M0–M10 — satu-satunya roadmap aktif.</p>
      <ul class="mt-4 space-y-2.5">
        <li v-for="item in checklist" :key="item.text" class="flex items-start gap-2.5 text-sm">
          <span
            class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
            :class="item.done ? 'bg-brand-green text-white' : 'border border-neutral-line text-transparent'"
            aria-hidden="true"
          >
            <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="m5 13 4 4L19 7"/></svg>
          </span>
          <span :class="item.done ? 'text-neutral-charcoal/50 line-through' : 'text-neutral-charcoal/80'">{{ item.text }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
