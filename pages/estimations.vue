<script setup lang="ts">
import type { EstimationDetail, EstimationListItem } from '~/types'
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { data } = await useAdminFetch<{ data: EstimationListItem[] }>('/api/admin/estimations')
const rows = computed(() => data.value?.data ?? [])

const detail = ref<EstimationDetail | null>(null)
const loadingDetail = ref(false)

async function openDetail(id: number) {
  if (detail.value?.id === id) {
    detail.value = null
    return
  }
  loadingDetail.value = true
  try {
    const res = await $fetch<{ data: EstimationDetail }>(`/api/admin/estimations/${id}`, {
      headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
    })
    detail.value = res.data
  } finally {
    loadingDetail.value = false
  }
}

function fmt(n: number | null) {
  return n === null ? '—' : 'Rp ' + n.toLocaleString('id-ID')
}
</script>

<template>
  <div>
    <PageHead title="Estimations" subtitle="Snapshot historis estimasi (read-only) — tidak berubah walau harga/kurs/produk berubah." />

    <div class="mt-6 overflow-x-auto rounded-2xl border border-neutral-line bg-white">
      <table class="w-full min-w-[760px] text-left text-sm">
        <thead class="border-b border-neutral-line bg-neutral-warm text-xs uppercase tracking-wide text-neutral-charcoal/60">
          <tr><th class="px-5 py-3">ID</th><th class="px-5 py-3">Jamaah</th><th class="px-5 py-3">Keberangkatan</th><th class="px-5 py-3">Durasi</th><th class="px-5 py-3">Total</th><th class="px-5 py-3">Per orang</th><th class="px-5 py-3">Submit</th><th class="px-5 py-3"></th></tr>
        </thead>
        <tbody class="divide-y divide-neutral-line">
          <template v-for="e in rows" :key="e.id">
            <tr :class="detail?.id === e.id ? 'bg-brand-sky/20' : ''">
              <td class="px-5 py-3 font-semibold text-brand-green">{{ e.estimationNumber }}</td>
              <td class="px-5 py-3">{{ e.pilgrims }} jamaah · {{ e.departureCity }}</td>
              <td class="px-5 py-3 text-neutral-charcoal/60">{{ e.departureDate }}</td>
              <td class="px-5 py-3 text-neutral-charcoal/60">{{ e.durationDays }} hari (Makkah {{ e.makkahNights }} · Madinah {{ e.madinahNights }})</td>
              <td class="px-5 py-3 font-semibold">{{ fmt(e.totalAmount) }}</td>
              <td class="px-5 py-3 text-neutral-charcoal/60">{{ fmt(e.perPersonAmount) }}</td>
              <td class="px-5 py-3 text-neutral-charcoal/60">{{ new Date(e.submittedAt).toLocaleString('id-ID') }}</td>
              <td class="px-5 py-3 text-right">
                <button type="button" class="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-teal hover:bg-brand-green/5" @click="openDetail(e.id)">
                  {{ detail?.id === e.id ? 'Tutup ▴' : 'Detail ▾' }}
                </button>
              </td>
            </tr>
            <tr v-if="detail?.id === e.id">
              <td colspan="8" class="bg-neutral-soft px-6 py-5">
                <p v-if="loadingDetail" class="text-sm text-neutral-charcoal/50">Memuat…</p>
                <template v-else>
                  <ul class="space-y-2">
                    <li v-for="item in detail.items" :key="item.id" class="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-neutral-line bg-white px-4 py-2.5 text-sm">
                      <span>
                        <span class="font-medium">{{ item.label }}</span>
                        <span v-if="item.detail" class="block text-xs text-neutral-charcoal/50">{{ item.detail }}</span>
                      </span>
                      <span class="font-semibold text-brand-green">{{ fmt(item.amount) }}</span>
                    </li>
                  </ul>
                  <div class="mt-3 flex flex-wrap gap-2">
                    <span v-for="r in detail.rates" :key="r.sourceCurrency + r.targetCurrency" class="rounded-full bg-brand-sky/50 px-3 py-1 text-xs font-semibold text-brand-green">
                      Kurs snapshot: {{ r.sourceCurrency }} → {{ r.targetCurrency }} @ {{ r.rate.toLocaleString('id-ID') }}
                    </span>
                  </div>
                </template>
              </td>
            </tr>
          </template>
          <tr v-if="rows.length === 0"><td colspan="8" class="px-5 py-8 text-center text-neutral-charcoal/50">Belum ada estimasi.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
