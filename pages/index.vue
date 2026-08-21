<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const { data: health } = await useFetch('/api/health')

const stats = [
  { label: 'Leads Baru', value: '—', hint: 'terhubung M6\'' },
  { label: 'Estimasi Terkirim', value: '—', hint: 'terhubung M6\'' },
  { label: 'Produk Aktif', value: '—', hint: 'terhubung M2\'' },
  { label: 'Kurs Hari Ini', value: '—', hint: 'terhubung M4\'' },
]

const checklist = [
  { text: "M0' — Scaffold Nuxt full-stack + deployable Vercel", done: true },
  { text: "M1' — Auth admin (session) + middleware guard", done: false },
  { text: "M2' — Database schema (Drizzle) + seeder data = mock frontend", done: false },
  { text: "M3' — CRUD produk (hotel, flight, transport, service)", done: false },
  { text: "M4' — Pricing engine + periods + kurs + parity tests", done: false },
  { text: "M5' — Public API /api/v1 untuk sht-web", done: false },
  { text: "M6' — Submit estimation → lead → WhatsApp dinamis", done: false },
  { text: "M7' — Dashboard widgets & lead pipeline", done: false },
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
      <p class="mt-1 text-sm text-neutral-charcoal/60">Pekerjaan berikutnya dikerjakan berurutan oleh agent.</p>
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
