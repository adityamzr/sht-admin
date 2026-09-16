<script setup lang="ts">
import type { TourTrip } from "~/types";
definePageMeta({ layout: "admin", middleware: "admin-auth" });

const search = ref("");
const status = ref("");
const page = ref(1);
const pageSize = ref(20);
const query = computed(() => ({ search: search.value || undefined, status: status.value || undefined, page: page.value, pageSize: pageSize.value }));
const { data, pending, refresh } = await useAdminFetch<{ data: TourTrip[]; meta: any }>("/api/admin/tour/trips", { query });
const rows = computed(() => data.value?.data ?? []);
const meta = computed(() => data.value?.meta ?? { page: 1, pageSize: 20, total: 0, pageCount: 1 });
const STATUSES = ["PLANNED","CONFIRMED","ACTIVE","COMPLETED","CANCELLED"];

const showForm = ref(false);
const form = reactive({
  id: null as number | null,
  name: "",
  departureDate: "",
  returnDate: "",
  routeSummary: "",
  capacity: 40,
  status: "PLANNED",
  notes: "",
});
const formError = ref<string | null>(null);
const formPending = ref(false);

function openCreate() {
  Object.assign(form, { id: null, name: "", departureDate: "", returnDate: "", routeSummary: "", capacity: 40, status: "PLANNED", notes: "" });
  showForm.value = true;
}
function openEdit(t: TourTrip) {
  Object.assign(form, { id: t.id, name: t.name, departureDate: t.departureDate, returnDate: t.returnDate, routeSummary: t.routeSummary, capacity: t.capacity, status: t.status, notes: t.notes || "" });
  showForm.value = true;
}
async function submit() {
  formPending.value = true;
  formError.value = null;
  try {
    const body: any = { name: form.name, departureDate: form.departureDate, returnDate: form.returnDate, routeSummary: form.routeSummary, capacity: Number(form.capacity), status: form.status, notes: form.notes || null };
    if (form.id) await adminPatch(`/api/admin/tour/trips/${form.id}`, body);
    else await adminPost("/api/admin/tour/trips", body);
    showForm.value = false;
    await refresh();
  } catch (err: any) {
    formError.value = err?.data?.statusMessage || "Gagal menyimpan";
  } finally { formPending.value = false; }
}
async function remove(t: TourTrip) {
  if (!confirm(`Hapus trip ${t.name}?`)) return;
  await adminDelete(`/api/admin/tour/trips/${t.id}`).catch(()=>{});
  await refresh();
}
</script>

<template>
  <div>
    <PageHead title="Trips" subtitle="Manajemen keberangkatan — tanggal, rute, kapasitas, status. Kode TRIP-2026-0001.">
      <template #actions><button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white" @click="openCreate">+ Tambah Trip</button></template>
    </PageHead>

    <div class="mt-6 flex flex-wrap gap-3">
      <input v-model="search" placeholder="Cari nama / kode / rute..." class="min-h-[44px] w-64 rounded-xl border border-neutral-line px-4 text-sm" @input="page=1" />
      <select v-model="status" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua Status</option><option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option></select>
    </div>

    <div v-if="showForm" class="mt-6 rounded-2xl border border-neutral-line bg-white p-6">
      <h3 class="font-heading text-base font-semibold">{{ form.id ? "Edit Trip" : "Tambah Trip" }}</h3>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label class="text-sm font-medium">Nama<input v-model="form.name" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" placeholder="Umroh Reguler 12D" /></label>
        <label class="text-sm font-medium">Rute<input v-model="form.routeSummary" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" placeholder="CGK-JED-MED-CGK" /></label>
        <label class="text-sm font-medium">Departure<input v-model="form.departureDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" /></label>
        <label class="text-sm font-medium">Return<input v-model="form.returnDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" /></label>
        <label class="text-sm font-medium">Kapasitas<input v-model="form.capacity" type="number" min="1" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" /></label>
        <label class="text-sm font-medium">Status<select v-model="form.status" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"><option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option></select></label>
        <label class="sm:col-span-2 text-sm font-medium">Notes<textarea v-model="form.notes" rows="2" class="mt-1 w-full rounded-xl border border-neutral-line px-4 py-2" /></label>
      </div>
      <p v-if="formError" class="mt-3 rounded-xl border border-gold-soft bg-gold-sand/50 px-4 py-2 text-sm">{{ formError }}</p>
      <div class="mt-4 flex gap-2">
        <button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white" :disabled="formPending" @click="submit">Simpan</button>
        <button type="button" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium" @click="showForm=false">Batal</button>
      </div>
    </div>

    <div class="mt-6 overflow-x-auto rounded-2xl border border-neutral-line bg-white">
      <table class="w-full min-w-[900px] text-left text-sm">
        <thead class="border-b bg-neutral-warm text-xs uppercase text-neutral-charcoal/60"><tr><th class="px-5 py-3">Kode</th><th class="px-5 py-3">Nama</th><th class="px-5 py-3">Tanggal</th><th class="px-5 py-3">Rute</th><th class="px-5 py-3">Kapasitas</th><th class="px-5 py-3">Status</th><th class="px-5 py-3 text-right">Aksi</th></tr></thead>
        <tbody class="divide-y">
          <tr v-for="t in rows" :key="t.id">
            <td class="px-5 py-3 font-mono text-xs font-semibold">{{ t.tripCode }}</td>
            <td class="px-5 py-3 font-medium">{{ t.name }}</td>
            <td class="px-5 py-3 text-xs">{{ t.departureDate }} → {{ t.returnDate }}</td>
            <td class="px-5 py-3 text-xs text-neutral-charcoal/60">{{ t.routeSummary || "—" }}</td>
            <td class="px-5 py-3">{{ t.capacity }}</td>
            <td class="px-5 py-3"><span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="t.status==='CONFIRMED' ? 'bg-sht-olive/10 text-brand-green' : 'bg-neutral-warm text-neutral-charcoal/60'">{{ t.status }}</span></td>
            <td class="px-5 py-3 text-right">
              <button class="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-teal hover:bg-sht-olive/5" @click="openEdit(t)">Edit</button>
              <NuxtLink :to="`/tour/trips/${t.id}`" class="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-charcoal/60 hover:text-brand-green">Detail</NuxtLink>
              <button class="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-charcoal/50 hover:text-red-600" @click="remove(t)">Hapus</button>
            </td>
          </tr>
          <tr v-if="rows.length===0"><td colspan="7" class="px-5 py-10 text-center text-neutral-charcoal/50">Belum ada trip.</td></tr>
        </tbody>
      </table>
    </div>
    <div class="mt-4"><AdminPagination :page="meta.page" :page-count="meta.pageCount" :total="meta.total" @change="(n)=>page=n" /></div>
  </div>
</template>
