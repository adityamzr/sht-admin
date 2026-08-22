<script setup lang="ts">
import type { Flight, Hotel, PricingPeriod, PricingRecord, Service, TransportRoute } from '~/types'
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { data, refresh } = await useAdminFetch<{ data: PricingRecord[] }>('/api/admin/pricing')
const { data: hotelsData } = await useAdminFetch<{ data: Hotel[] }>('/api/admin/hotels')
const { data: flightsData } = await useAdminFetch<{ data: Flight[] }>('/api/admin/flights')
const { data: routesData } = await useAdminFetch<{ data: TransportRoute[] }>('/api/admin/routes')
const { data: servicesData } = await useAdminFetch<{ data: Service[] }>('/api/admin/services')
const { data: periodsData } = await useAdminFetch<{ data: PricingPeriod[] }>('/api/admin/pricing-periods')

const rows = computed(() => data.value?.data ?? [])
const periods = computed(() => (periodsData.value?.data ?? []).filter((p) => p.isActive))

const entityLabel: Record<string, string> = {
  hotel_room_type: 'Tipe Kamar Hotel',
  flight: 'Penerbangan',
  route_vehicle: 'Kombinasi Rute × Kendaraan',
  service: 'Layanan',
}
const strategyLabel: Record<string, string> = {
  manual: 'Harga jual manual',
  cost_plus_fixed: 'Supplier cost + markup tetap',
  cost_plus_percentage: 'Supplier cost + markup %',
}
const unitLabel: Record<string, string> = { pax: 'per orang', room_night: 'per kamar/malam', vehicle_trip: 'per trip', group_session: 'per sesi' }

interface EntityOption { value: string; label: string }
const entityOptions = computed<Record<string, EntityOption[]>>(() => ({
  hotel_room_type: (hotelsData.value?.data ?? []).flatMap((h) => h.roomTypes.map((r) => ({ value: String(r.id), label: `${h.name} — ${r.name} (kap. ${r.capacity})` }))),
  flight: (flightsData.value?.data ?? []).map((f) => ({ value: String(f.id), label: `${f.airline} · ${f.routeLabel}` })),
  route_vehicle: (routesData.value?.data ?? []).flatMap((r) => r.vehicleOptions.map((o) => ({ value: String(o.id), label: `${r.name} · ${o.vehicle?.name ?? '#' + o.vehicleId}` }))),
  service: (servicesData.value?.data ?? []).map((s) => ({ value: String(s.id), label: `${s.name} (${s.pricingUnit})` })),
}))

const form = reactive({
  id: null as number | null,
  entityType: 'hotel_room_type',
  entityId: '',
  periodId: '',
  currency: 'IDR',
  pricingUnit: 'room_night',
  strategy: 'manual',
  supplierCost: '',
  markupType: 'fixed',
  markupValue: '',
  sellingPrice: '',
  internalNotes: '',
  isActive: true,
})
const showForm = ref(false)
const error = ref<string | null>(null)
const pending = ref(false)

function openCreate() {
  Object.assign(form, { id: null, entityType: 'hotel_room_type', entityId: '', periodId: '', currency: 'IDR', pricingUnit: 'room_night', strategy: 'manual', supplierCost: '', markupType: 'fixed', markupValue: '', sellingPrice: '', internalNotes: '', isActive: true })
  showForm.value = true
  error.value = null
}
function onEntityTypeChange() {
  form.pricingUnit = form.entityType === 'hotel_room_type' ? 'room_night' : form.entityType === 'flight' ? 'pax' : form.entityType === 'route_vehicle' ? 'vehicle_trip' : 'pax'
}
async function submit() {
  pending.value = true
  error.value = null
  try {
    const body = {
      entityType: form.entityType,
      entityId: Number(form.entityId),
      periodId: Number(form.periodId),
      currency: form.currency,
      pricingUnit: form.pricingUnit,
      strategy: form.strategy,
      supplierCost: form.supplierCost === '' ? null : Number(form.supplierCost),
      markupType: form.strategy === 'manual' ? null : form.markupType,
      markupValue: form.markupValue === '' ? null : Number(form.markupValue),
      sellingPrice: form.sellingPrice === '' ? null : Number(form.sellingPrice),
      internalNotes: form.internalNotes || null,
      isActive: form.isActive,
    }
    await adminPost('/api/admin/pricing', body)
    showForm.value = false
    await refresh()
  } catch (err: unknown) {
    error.value = (err as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'Gagal menyimpan'
  } finally {
    pending.value = false
  }
}
async function toggle(r: PricingRecord) {
  await adminPatch(`/api/admin/pricing/${r.id}`, { isActive: !r.isActive }).catch(() => {})
  await refresh()
}
async function remove(r: PricingRecord) {
  if (!confirm('Hapus pricing record ini? (estimasi historis aman — snapshot menyimpan salinan)')) return
  await adminDelete(`/api/admin/pricing/${r.id}`).catch(() => {})
  await refresh()
}
function fmt(n: number | null) {
  return n === null ? '—' : 'Rp ' + n.toLocaleString('id-ID')
}
</script>

<template>
  <div>
    <PageHead title="Pricing" subtitle="Satu arsitektur harga untuk semua entitas: strategi, periode, mata uang. Data supplier cost/markup = INTERNAL.">
      <template #actions>
        <button type="button" class="min-h-[40px] rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white" @click="openCreate">+ Tambah Harga</button>
      </template>
    </PageHead>

    <div v-if="showForm" class="mt-6 rounded-2xl border border-neutral-line bg-white p-6">
      <h3 class="font-heading text-base font-semibold">Tambah Harga</h3>
      <div class="mt-4 grid gap-3 sm:grid-cols-3">
        <label class="text-sm font-medium">Tipe entitas
          <select v-model="form.entityType" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3" @change="onEntityTypeChange">
            <option v-for="(label, key) in entityLabel" :key="key" :value="key">{{ label }}</option>
          </select>
        </label>
        <label class="text-sm font-medium">Entitas
          <select v-model="form.entityId" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3">
            <option value="" disabled>Pilih…</option>
            <option v-for="o in entityOptions[form.entityType]" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </label>
        <label class="text-sm font-medium">Periode
          <select v-model="form.periodId" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3">
            <option value="" disabled>Pilih…</option>
            <option v-for="p in periods" :key="p.id" :value="p.id">{{ p.name }} (prioritas {{ p.priority }})</option>
          </select>
        </label>
        <label class="text-sm font-medium">Mata uang
          <select v-model="form.currency" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"><option>IDR</option><option>USD</option><option>SAR</option></select>
        </label>
        <label class="text-sm font-medium">Unit harga
          <select v-model="form.pricingUnit" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3">
            <option v-for="(label, key) in unitLabel" :key="key" :value="key">{{ key }} ({{ label }})</option>
          </select>
        </label>
        <label class="text-sm font-medium">Strategi
          <select v-model="form.strategy" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3">
            <option v-for="(label, key) in strategyLabel" :key="key" :value="key">{{ label }}</option>
          </select>
        </label>
        <template v-if="form.strategy !== 'manual'">
          <label class="text-sm font-medium">Supplier cost (INTERNAL)
            <input v-model="form.supplierCost" type="number" min="0" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" />
          </label>
          <label class="text-sm font-medium">Tipe markup
            <select v-model="form.markupType" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"><option value="fixed">Tetap (Rp)</option><option value="percentage">Persen (%)</option></select>
          </label>
          <label class="text-sm font-medium">Nilai markup
            <input v-model="form.markupValue" type="number" min="0" step="0.01" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" />
          </label>
        </template>
        <label v-else class="text-sm font-medium">Harga jual
          <input v-model="form.sellingPrice" type="number" min="0" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" />
        </label>
        <label class="text-sm font-medium sm:col-span-2">Catatan internal
          <input v-model="form.internalNotes" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" placeholder="opsional — tidak pernah tampil publik" />
        </label>
      </div>
      <p v-if="error" class="mt-3 rounded-xl border border-gold-soft bg-gold-sand/50 px-4 py-2 text-sm" role="alert">{{ error }}</p>
      <div class="mt-4 flex gap-2">
        <button type="button" class="min-h-[40px] rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" :disabled="pending" @click="submit">Simpan</button>
        <button type="button" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium" @click="showForm = false">Batal</button>
      </div>
    </div>

    <div class="mt-6 overflow-x-auto rounded-2xl border border-neutral-line bg-white">
      <table class="w-full min-w-[860px] text-left text-sm">
        <thead class="border-b border-neutral-line bg-neutral-warm text-xs uppercase tracking-wide text-neutral-charcoal/60">
          <tr><th class="px-5 py-3">Entitas</th><th class="px-5 py-3">Strategi</th><th class="px-5 py-3">Internal</th><th class="px-5 py-3">Harga Jual</th><th class="px-5 py-3">Unit</th><th class="px-5 py-3">Status</th><th class="px-5 py-3 text-right">Aksi</th></tr>
        </thead>
        <tbody class="divide-y divide-neutral-line">
          <tr v-for="r in rows" :key="r.id">
            <td class="px-5 py-3">
              <p class="font-medium">{{ entityLabel[r.entityType] ?? r.entityType }} #{{ r.entityId }}</p>
              <p class="text-xs text-neutral-charcoal/50">periode #{{ r.periodId }} · {{ r.currency }}</p>
            </td>
            <td class="px-5 py-3 text-neutral-charcoal/60">{{ strategyLabel[r.strategy] ?? r.strategy }}</td>
            <td class="px-5 py-3 text-neutral-charcoal/50">
              <template v-if="r.strategy === 'manual'">—</template>
              <template v-else>
                cost {{ fmt(r.supplierCost) }} <template v-if="r.markupType === 'percentage'">+ {{ r.markupValue }}%</template><template v-else>+ {{ fmt(r.markupValue) }}</template>
              </template>
            </td>
            <td class="px-5 py-3 font-semibold text-brand-green">{{ fmt(r.computedSellingPrice) }}</td>
            <td class="px-5 py-3 text-neutral-charcoal/60">{{ r.pricingUnit }}</td>
            <td class="px-5 py-3">
              <button type="button" class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="r.isActive ? 'bg-brand-green/10 text-brand-green' : 'bg-neutral-warm text-neutral-charcoal/50'" @click="toggle(r)">{{ r.isActive ? 'Aktif' : 'Nonaktif' }}</button>
            </td>
            <td class="px-5 py-3 text-right">
              <button type="button" class="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-charcoal/50 hover:text-red-600" @click="remove(r)">Hapus</button>
            </td>
          </tr>
          <tr v-if="rows.length === 0"><td colspan="7" class="px-5 py-8 text-center text-neutral-charcoal/50">Belum ada pricing record.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
