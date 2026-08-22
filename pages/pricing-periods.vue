<script setup lang="ts">
import type { PricingPeriod } from '~/types'
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { data, refresh } = await useAdminFetch<{ data: PricingPeriod[] }>('/api/admin/pricing-periods')
const rows = computed(() => data.value?.data ?? [])

const form = reactive({ id: null as number | null, name: '', startDate: '', endDate: '', priority: 10, isActive: true })
const showForm = ref(false)
const error = ref<string | null>(null)
const pending = ref(false)

function openCreate() {
  Object.assign(form, { id: null, name: '', startDate: '', endDate: '', priority: 10, isActive: true })
  showForm.value = true
  error.value = null
}
function openEdit(p: PricingPeriod) {
  Object.assign(form, { id: p.id, name: p.name, startDate: p.startDate, endDate: p.endDate, priority: p.priority, isActive: p.isActive })
  showForm.value = true
  error.value = null
}
async function submit() {
  pending.value = true
  error.value = null
  try {
    const body = { name: form.name, startDate: form.startDate, endDate: form.endDate, priority: Number(form.priority), isActive: form.isActive }
    if (form.id) await adminPatch(`/api/admin/pricing-periods/${form.id}`, body)
    else await adminPost('/api/admin/pricing-periods', body)
    showForm.value = false
    await refresh()
  } catch (err: unknown) {
    error.value = (err as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'Gagal menyimpan'
  } finally {
    pending.value = false
  }
}
async function toggle(p: PricingPeriod) {
  await adminPatch(`/api/admin/pricing-periods/${p.id}`, { isActive: !p.isActive }).catch(() => {})
  await refresh()
}
async function archive(p: PricingPeriod) {
  if (!confirm(`Arsipkan periode ${p.name}?`)) return
  await adminDelete(`/api/admin/pricing-periods/${p.id}`).catch(() => {})
  await refresh()
}
</script>

<template>
  <div>
    <PageHead title="Pricing Periods" subtitle="Prioritas numerik unik: saat beberapa periode mencakup tanggal yang sama, prioritas tertinggi menang.">
      <template #actions>
        <button type="button" class="min-h-[40px] rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white" @click="openCreate">+ Tambah Periode</button>
      </template>
    </PageHead>

    <div v-if="showForm" class="mt-6 rounded-2xl border border-neutral-line bg-white p-6">
      <h3 class="font-heading text-base font-semibold">{{ form.id ? 'Edit Periode' : 'Tambah Periode' }}</h3>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label class="text-sm font-medium">Nama <input v-model="form.name" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" placeholder="High Season" /></label>
        <label class="text-sm font-medium">Prioritas (angka; unik)
          <input v-model="form.priority" type="number" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" />
        </label>
        <label class="text-sm font-medium">Mulai <input v-model="form.startDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" /></label>
        <label class="text-sm font-medium">Selesai <input v-model="form.endDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" /></label>
      </div>
      <label class="mt-3 flex items-center gap-2 text-sm font-medium"><input v-model="form.isActive" type="checkbox" class="h-4 w-4 accent-brand-green" /> Aktif</label>
      <p v-if="error" class="mt-3 rounded-xl border border-gold-soft bg-gold-sand/50 px-4 py-2 text-sm" role="alert">{{ error }}</p>
      <div class="mt-4 flex gap-2">
        <button type="button" class="min-h-[40px] rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" :disabled="pending" @click="submit">Simpan</button>
        <button type="button" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium" @click="showForm = false">Batal</button>
      </div>
    </div>

    <div class="mt-6 overflow-x-auto rounded-2xl border border-neutral-line bg-white">
      <table class="w-full min-w-[640px] text-left text-sm">
        <thead class="border-b border-neutral-line bg-neutral-warm text-xs uppercase tracking-wide text-neutral-charcoal/60">
          <tr><th class="px-5 py-3">Periode</th><th class="px-5 py-3">Rentang</th><th class="px-5 py-3">Prioritas</th><th class="px-5 py-3">Status</th><th class="px-5 py-3 text-right">Aksi</th></tr>
        </thead>
        <tbody class="divide-y divide-neutral-line">
          <tr v-for="p in rows" :key="p.id">
            <td class="px-5 py-3 font-medium">{{ p.name }}</td>
            <td class="px-5 py-3 text-neutral-charcoal/60">{{ p.startDate }} → {{ p.endDate }}</td>
            <td class="px-5 py-3"><span class="rounded-full bg-brand-sky/50 px-2.5 py-1 text-xs font-bold text-brand-green">{{ p.priority }}</span></td>
            <td class="px-5 py-3">
              <button type="button" class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="p.isActive ? 'bg-brand-green/10 text-brand-green' : 'bg-neutral-warm text-neutral-charcoal/50'" @click="toggle(p)">{{ p.isActive ? 'Aktif' : 'Nonaktif' }}</button>
            </td>
            <td class="px-5 py-3 text-right">
              <button type="button" class="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-teal hover:bg-brand-green/5" @click="openEdit(p)">Edit</button>
              <button type="button" class="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-charcoal/50 hover:text-red-600" @click="archive(p)">Arsipkan</button>
            </td>
          </tr>
          <tr v-if="rows.length === 0"><td colspan="5" class="px-5 py-8 text-center text-neutral-charcoal/50">Belum ada data.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
