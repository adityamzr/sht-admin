<script setup lang="ts">
import type { TourTrip } from "~/types";
import { Pencil, Trash2, Eye } from 'lucide-vue-next'
definePageMeta({ layout: "admin", middleware: "admin-auth" });
const { tripStatusLabel } = useTourLabels();

const search = ref("");
const status = ref("");
const page = ref(1);
const pageSize = ref(20);
const query = computed(() => ({ search: search.value || undefined, status: status.value || undefined, page: page.value, pageSize: pageSize.value }));
const { data, refresh } = await useAdminFetch<{ data: TourTrip[]; meta: any }>("/api/admin/tour/trips", { query });
const rows = computed(() => data.value?.data ?? []);
const meta = computed(() => data.value?.meta ?? { page: 1, pageSize: 20, total: 0, pageCount: 1 });
const STATUSES = ["PLANNED","CONFIRMED","ACTIVE","COMPLETED","CANCELLED"];

const showForm = ref(false);
const form = reactive({ id: null as number | null, name: "", departureDate: "", returnDate: "", routeSummary: "", capacity: 40, status: "PLANNED", notes: "" });
const formError = ref<string | null>(null);
const formPending = ref(false);

function openCreate() { Object.assign(form, { id: null, name: "", departureDate: "", returnDate: "", routeSummary: "", capacity: 40, status: "PLANNED", notes: "" }); showForm.value = true; }
function openEdit(t: any) { Object.assign(form, { id: t.id, name: t.name, departureDate: t.departureDate, returnDate: t.returnDate, routeSummary: t.routeSummary, capacity: t.capacity, status: t.status, notes: t.notes || "" }); showForm.value = true; }
async function submit() {
  formPending.value = true; formError.value = null;
  try {
    const body: any = { name: form.name, departureDate: form.departureDate, returnDate: form.returnDate, routeSummary: form.routeSummary, capacity: Number(form.capacity), status: form.status, notes: form.notes || null };
    if (form.id) await adminPatch(`/api/admin/tour/trips/${form.id}`, body); else await adminPost("/api/admin/tour/trips", body);
    showForm.value = false; await refresh();
  } catch (err: any) { formError.value = err?.data?.statusMessage || "Gagal menyimpan"; } finally { formPending.value = false; }
}
async function remove(t: any) { if (!confirm(`Hapus trip ${t.name}?`)) return; await adminDelete(`/api/admin/tour/trips/${t.id}`).catch(()=>{}); await refresh(); }
</script>

<template>
  <div>
    <PageHead title="Trips" subtitle="Kelola jadwal keberangkatan dan kapasitas perjalanan.">
      <template #actions><button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white" @click="openCreate">+ Tambah Trip</button></template>
    </PageHead>

    <div class="mt-6 flex flex-wrap gap-3">
      <input v-model="search" placeholder="Cari nama / kode / rute..." class="min-h-[44px] w-64 rounded-xl border border-neutral-line px-4 text-sm" @input="page=1" />
      <select v-model="status" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua Status</option><option v-for="s in STATUSES" :key="s" :value="s">{{ tripStatusLabel(s) }}</option></select>
    </div>

    <TourModal :open="showForm" :title="form.id ? 'Edit Trip' : 'Tambah Trip'" subtitle="Tanggal, rute, kapasitas, dan status perjalanan" @close="showForm=false">
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="sm:col-span-2 text-sm font-medium">Nama Trip *<input v-model="form.name" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" placeholder="Umrah Reguler Desember 2026" /></label>
        <label class="text-sm font-medium">Tanggal Berangkat<input v-model="form.departureDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" /></label>
        <label class="text-sm font-medium">Tanggal Pulang<input v-model="form.returnDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" /></label>
        <label class="text-sm font-medium">Rute<input v-model="form.routeSummary" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" placeholder="CGK-JED-MED-CGK" /></label>
        <label class="text-sm font-medium">Kapasitas<input v-model.number="form.capacity" type="number" min="1" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" /></label>
        <label class="text-sm font-medium">Status<select v-model="form.status" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm"><option v-for="s in STATUSES" :key="s" :value="s">{{ tripStatusLabel(s) }}</option></select></label>
        <label class="sm:col-span-2 text-sm font-medium">Catatan<textarea v-model="form.notes" rows="2" class="mt-1 w-full rounded-xl border border-neutral-line px-4 py-2 text-sm" /></label>
      </div>
      <p v-if="formError" class="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{{ formError }}</p>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="min-h-[40px] rounded-xl border px-4 py-2 text-sm" @click="showForm=false">Batal</button>
          <button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-5 py-2 text-sm font-semibold text-white" :disabled="formPending" @click="submit">Simpan</button>
        </div>
      </template>
    </TourModal>

    <div class="mt-6 overflow-x-auto rounded-2xl border border-neutral-line bg-white">
      <table class="w-full min-w-[900px] text-left text-sm">
        <thead class="border-b bg-neutral-warm text-xs uppercase text-neutral-charcoal/60"><tr><th class="px-5 py-3">Kode / Nama</th><th class="px-5 py-3">Tanggal</th><th class="px-5 py-3">Rute</th><th class="px-5 py-3">Kapasitas</th><th class="px-5 py-3">Status</th><th class="px-5 py-3 text-right">Aksi</th></tr></thead>
        <tbody class="divide-y">
          <tr v-for="t in rows" :key="t.id">
            <td class="px-5 py-3"><p class="font-mono text-xs font-semibold">{{ t.tripCode }}</p><p class="font-medium">{{ t.name }}</p></td>
            <td class="px-5 py-3 text-xs">{{ t.departureDate }} → {{ t.returnDate }}</td>
            <td class="px-5 py-3 text-xs text-neutral-charcoal/60">{{ t.routeSummary || "—" }}</td>
            <td class="px-5 py-3 text-xs"><span class="font-medium">{{ t.capacity }} pax</span><br/><span class="text-neutral-charcoal/50">terisi dari Orders</span></td>
            <td class="px-5 py-3"><TourStatusBadge :status="t.status" type="trip" /></td>
            <td class="px-5 py-3 text-right">
              <div class="flex justify-end gap-1">
                <button class="rounded-xl p-2 text-neutral-charcoal/60 hover:bg-neutral-warm" title="Edit" @click="openEdit(t)"><Pencil class="h-4 w-4" /></button>
                <NuxtLink :to="`/tour/trips/${t.id}`" class="rounded-xl p-2 text-neutral-charcoal/50 hover:bg-neutral-warm hover:text-brand-green" title="Detail"><Eye class="h-4 w-4" /></NuxtLink>
                <button class="rounded-xl p-2 text-neutral-charcoal/40 hover:bg-red-50 hover:text-red-600" title="Hapus" @click="remove(t)"><Trash2 class="h-4 w-4" /></button>
              </div>
            </td>
          </tr>
          <tr v-if="rows.length===0"><td colspan="6" class="px-5 py-10 text-center text-neutral-charcoal/50">Belum ada trip.</td></tr>
        </tbody>
      </table>
    </div>
    <div class="mt-4"><AdminPagination :page="meta.page" :page-count="meta.pageCount" :total="meta.total" @change="(n)=>page=n" /></div>
  </div>
</template>
