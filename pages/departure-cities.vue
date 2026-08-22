<script setup lang="ts">
import type { DepartureCity } from '~/types'
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { data, refresh } = await useAdminFetch<{ data: DepartureCity[] }>('/api/admin/departure-cities')
const rows = computed(() => data.value?.data ?? [])

const form = reactive({ id: null as number | null, code: '', name: '', feePerPax: '' as string | number, feeCurrency: 'IDR', isActive: true, sortOrder: 0 })
const showForm = ref(false)
const error = ref<string | null>(null)
const pending = ref(false)

function openCreate() {
  Object.assign(form, { id: null, code: '', name: '', feePerPax: '', feeCurrency: 'IDR', isActive: true, sortOrder: 0 })
  showForm.value = true
  error.value = null
}
function openEdit(c: DepartureCity) {
  Object.assign(form, { id: c.id, code: c.code, name: c.name, feePerPax: c.feePerPax ?? '', feeCurrency: c.feeCurrency, isActive: c.isActive, sortOrder: c.sortOrder })
  showForm.value = true
  error.value = null
}
async function submit() {
  pending.value = true
  error.value = null
  try {
    const body = {
      code: form.code, name: form.name,
      feePerPax: form.feePerPax === '' ? null : Number(form.feePerPax),
      feeCurrency: form.feeCurrency, isActive: form.isActive, sortOrder: Number(form.sortOrder) || 0,
    }
    if (form.id) await adminPatch(`/api/admin/departure-cities/${form.id}`, body)
    else await adminPost('/api/admin/departure-cities', body)
    showForm.value = false
    await refresh()
  } catch (err: unknown) {
    error.value = (err as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'Gagal menyimpan'
  } finally {
    pending.value = false
  }
}
async function toggle(c: DepartureCity) {
  await adminPatch(`/api/admin/departure-cities/${c.id}`, { isActive: !c.isActive }).catch(() => {})
  await refresh()
}
async function remove(c: DepartureCity) {
  if (!confirm(`Nonaktifkan ${c.name}?`)) return
  await adminDelete(`/api/admin/departure-cities/${c.id}`).catch(() => {})
  await refresh()
}
</script>

<template>
  <div>
    <PageHead title="Departure Cities" subtitle="Kota keberangkatan & fee per jamaah (berpengaruh ke pricing).">
      <template #actions>
        <button type="button" class="min-h-[40px] rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white" @click="openCreate">+ Tambah Kota</button>
      </template>
    </PageHead>

    <div v-if="showForm" class="mt-6 rounded-2xl border border-neutral-line bg-white p-6">
      <h3 class="font-heading text-base font-semibold">{{ form.id ? 'Edit Kota' : 'Tambah Kota' }}</h3>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label class="text-sm font-medium">Kode
          <input v-model="form.code" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" placeholder="bandung" />
        </label>
        <label class="text-sm font-medium">Nama
          <input v-model="form.name" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" placeholder="Bandung" />
        </label>
        <label class="text-sm font-medium">Fee per pax (kosongkan bila 0)
          <input v-model="form.feePerPax" type="number" min="0" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" placeholder="650000" />
        </label>
        <label class="text-sm font-medium">Mata uang fee
          <select v-model="form.feeCurrency" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3">
            <option>IDR</option><option>USD</option><option>SAR</option>
          </select>
        </label>
      </div>
      <label class="mt-3 flex items-center gap-2 text-sm font-medium">
        <input v-model="form.isActive" type="checkbox" class="h-4 w-4 accent-brand-green" /> Aktif
      </label>
      <p v-if="error" class="mt-3 rounded-xl border border-gold-soft bg-gold-sand/50 px-4 py-2 text-sm" role="alert">{{ error }}</p>
      <div class="mt-4 flex gap-2">
        <button type="button" class="min-h-[40px] rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" :disabled="pending" @click="submit">Simpan</button>
        <button type="button" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium" @click="showForm = false">Batal</button>
      </div>
    </div>

    <div class="mt-6 overflow-x-auto rounded-2xl border border-neutral-line bg-white">
      <table class="w-full min-w-[640px] text-left text-sm">
        <thead class="border-b border-neutral-line bg-neutral-warm text-xs uppercase tracking-wide text-neutral-charcoal/60">
          <tr><th class="px-5 py-3">Nama</th><th class="px-5 py-3">Kode</th><th class="px-5 py-3">Fee / pax</th><th class="px-5 py-3">Status</th><th class="px-5 py-3 text-right">Aksi</th></tr>
        </thead>
        <tbody class="divide-y divide-neutral-line">
          <tr v-for="c in rows" :key="c.id">
            <td class="px-5 py-3 font-medium">{{ c.name }}</td>
            <td class="px-5 py-3 text-neutral-charcoal/60">{{ c.code }}</td>
            <td class="px-5 py-3">{{ c.feePerPax ? `${c.feePerPax.toLocaleString('id-ID')} ${c.feeCurrency}` : '—' }}</td>
            <td class="px-5 py-3">
              <button type="button" class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="c.isActive ? 'bg-brand-green/10 text-brand-green' : 'bg-neutral-warm text-neutral-charcoal/50'" @click="toggle(c)">
                {{ c.isActive ? 'Aktif' : 'Nonaktif' }}
              </button>
            </td>
            <td class="px-5 py-3 text-right">
              <button type="button" class="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-teal hover:bg-brand-green/5" @click="openEdit(c)">Edit</button>
              <button type="button" class="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-charcoal/50 hover:text-red-600" @click="remove(c)">Nonaktifkan</button>
            </td>
          </tr>
          <tr v-if="rows.length === 0"><td colspan="5" class="px-5 py-8 text-center text-neutral-charcoal/50">Belum ada data.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
