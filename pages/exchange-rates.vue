<script setup lang="ts">
import type { ExchangeRate } from '~/types'
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { data, refresh } = await useAdminFetch<{ data: ExchangeRate[] }>('/api/admin/exchange-rates')
const rows = computed(() => data.value?.data ?? [])

const form = reactive({ sourceCurrency: 'USD', targetCurrency: 'IDR', rate: '' })
const showForm = ref(false)
const error = ref<string | null>(null)
const pending = ref(false)

async function submit() {
  pending.value = true
  error.value = null
  try {
    await adminPost('/api/admin/exchange-rates', { sourceCurrency: form.sourceCurrency, targetCurrency: form.targetCurrency, rate: Number(form.rate) })
    showForm.value = false
    await refresh()
  } catch (err: unknown) {
    error.value = (err as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'Gagal menyimpan'
  } finally {
    pending.value = false
  }
}
async function deactivate(r: ExchangeRate) {
  if (!confirm(`Nonaktifkan kurs ${r.sourceCurrency}→${r.targetCurrency}?`)) return
  await adminDelete(`/api/admin/exchange-rates/${r.id}`).catch(() => {})
  await refresh()
}
</script>

<template>
  <div>
    <PageHead title="Exchange Rates" subtitle="Kurs dikelola admin (tanpa API eksternal). Kurs aktif di-snapshot ke setiap estimasi.">
      <template #actions>
        <button type="button" class="min-h-[40px] rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white" @click="showForm = !showForm">+ Tambah Kurs</button>
      </template>
    </PageHead>

    <div v-if="showForm" class="mt-6 rounded-2xl border border-neutral-line bg-white p-6">
      <h3 class="font-heading text-base font-semibold">Kurs Baru</h3>
      <p class="mt-1 text-xs text-neutral-charcoal/60">Menambah kurs untuk pasangan yang sama otomatis menonaktifkan kurs lama (satu kurs aktif per pasangan).</p>
      <div class="mt-4 grid gap-3 sm:grid-cols-3">
        <label class="text-sm font-medium">Dari
          <select v-model="form.sourceCurrency" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"><option>USD</option><option>SAR</option></select>
        </label>
        <label class="text-sm font-medium">Ke
          <select v-model="form.targetCurrency" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"><option>IDR</option></select>
        </label>
        <label class="text-sm font-medium">Rate (1 unit = Rp …)
          <input v-model="form.rate" type="number" step="0.000001" min="0" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" placeholder="16200" />
        </label>
      </div>
      <p v-if="error" class="mt-3 rounded-xl border border-gold-soft bg-gold-sand/50 px-4 py-2 text-sm" role="alert">{{ error }}</p>
      <div class="mt-4 flex gap-2">
        <button type="button" class="min-h-[40px] rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" :disabled="pending" @click="submit">Simpan</button>
        <button type="button" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium" @click="showForm = false">Batal</button>
      </div>
    </div>

    <div class="mt-6 overflow-x-auto rounded-2xl border border-neutral-line bg-white">
      <table class="w-full min-w-[560px] text-left text-sm">
        <thead class="border-b border-neutral-line bg-neutral-warm text-xs uppercase tracking-wide text-neutral-charcoal/60">
          <tr><th class="px-5 py-3">Pasangan</th><th class="px-5 py-3">Rate</th><th class="px-5 py-3">Berlaku sejak</th><th class="px-5 py-3">Status</th><th class="px-5 py-3 text-right">Aksi</th></tr>
        </thead>
        <tbody class="divide-y divide-neutral-line">
          <tr v-for="r in rows" :key="r.id">
            <td class="px-5 py-3 font-medium">{{ r.sourceCurrency }} → {{ r.targetCurrency }}</td>
            <td class="px-5 py-3">{{ r.rate.toLocaleString('id-ID', { maximumFractionDigits: 6 }) }}</td>
            <td class="px-5 py-3 text-neutral-charcoal/60">{{ new Date(r.effectiveAt).toLocaleString('id-ID') }}</td>
            <td class="px-5 py-3">
              <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="r.isActive ? 'bg-brand-green/10 text-brand-green' : 'bg-neutral-warm text-neutral-charcoal/50'">{{ r.isActive ? 'Aktif' : 'Nonaktif' }}</span>
            </td>
            <td class="px-5 py-3 text-right">
              <button v-if="r.isActive" type="button" class="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-charcoal/50 hover:text-red-600" @click="deactivate(r)">Nonaktifkan</button>
            </td>
          </tr>
          <tr v-if="rows.length === 0"><td colspan="5" class="px-5 py-8 text-center text-neutral-charcoal/50">Belum ada data.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
