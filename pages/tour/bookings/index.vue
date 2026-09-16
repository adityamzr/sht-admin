<script setup lang="ts">
import type { TourBooking, TourVendor } from "~/types";
definePageMeta({ layout: "admin", middleware: "admin-auth" });
const { bookingTypeLabel, bookingStatusLabel, vendorTypeLabel } = useTourLabels();

const search = ref("");
const status = ref("");
const bookingType = ref("");
const vendorId = ref("");
const page = ref(1);
const pageSize = ref(20);
const query = computed(() => ({
  search: search.value || undefined,
  status: status.value || undefined,
  bookingType: bookingType.value || undefined,
  vendorId: vendorId.value ? Number(vendorId.value) : undefined,
  page: page.value,
  pageSize: pageSize.value,
}));
const { data, refresh } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/bookings", { query });
const rows = computed(() => data.value?.data ?? []);
const meta = computed(() => data.value?.meta ?? { page: 1, pageSize: 20, total: 0, pageCount: 1 });

const { data: vendorsData } = await useAdminFetch<{ data: TourVendor[]; meta: any }>("/api/admin/tour/vendors", { query: { pageSize: 100 } });
const vendors = computed(() => vendorsData.value?.data ?? []);
const { data: tripsData } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/trips", { query: { pageSize: 100 } });
const trips = computed(() => tripsData.value?.data ?? []);
const { data: ordersData } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/orders", { query: { pageSize: 100 } });
const orders = computed(() => ordersData.value?.data ?? []);

const STATUSES = ["DRAFT","CONFIRMED","PAID","COMPLETED","CANCELLED"];
const TYPES = ["HOTEL","TRANSPORT","VISA","FLIGHT","SISKOPATUH","MUTHAWWIF","HANDLING","OTHER"];

const showForm = ref(false);
const form = reactive({
  id: null as number | null,
  bookingDate: new Date().toISOString().slice(0,10),
  tripId: "" as any,
  orderId: "" as any,
  vendorId: "" as any,
  bookingType: "HOTEL",
  description: "",
  currency: "IDR",
  amount: 0,
  exchangeRateSnapshot: "" as any,
  status: "DRAFT",
  dueDate: "",
  notes: "",
});
const formError = ref<string | null>(null);
const formPending = ref(false);

function openCreate() {
  Object.assign(form, { id: null, bookingDate: new Date().toISOString().slice(0,10), tripId: "", orderId: "", vendorId: "", bookingType: "HOTEL", description: "", currency: "IDR", amount: 0, exchangeRateSnapshot: "", status: "DRAFT", dueDate: "", notes: "" });
  showForm.value = true;
}
function openEdit(b: any) {
  Object.assign(form, {
    id: b.id,
    bookingDate: b.bookingDate,
    tripId: b.tripId || "",
    orderId: b.orderId || "",
    vendorId: b.vendorId,
    bookingType: b.bookingType,
    description: b.description,
    currency: b.currency,
    amount: b.amount,
    exchangeRateSnapshot: b.exchangeRateSnapshot || "",
    status: b.status,
    dueDate: b.dueDate || "",
    notes: b.notes || "",
  });
  showForm.value = true;
}
async function submit() {
  formPending.value = true;
  formError.value = null;
  try {
    // Server computes amountIdr authoritatively; client only sends amount + snapshot
    // For IDR, snapshot must be null (server will nullify anyway)
    const isIdr = form.currency === 'IDR';
    const body: any = {
      bookingDate: form.bookingDate,
      tripId: form.tripId ? Number(form.tripId) : null,
      orderId: form.orderId ? Number(form.orderId) : null,
      vendorId: Number(form.vendorId),
      bookingType: form.bookingType,
      description: form.description,
      currency: form.currency,
      amount: Number(form.amount),
      exchangeRateSnapshot: isIdr ? null : (form.exchangeRateSnapshot ? Number(form.exchangeRateSnapshot) : null),
      status: form.status,
      dueDate: form.dueDate || null,
      notes: form.notes || null,
    };
    if (form.id) await adminPatch(`/api/admin/tour/bookings/${form.id}`, body);
    else await adminPost("/api/admin/tour/bookings", body);
    showForm.value = false;
    await refresh();
  } catch (err: any) {
    formError.value = err?.data?.statusMessage || err?.message || "Gagal menyimpan — cek amount, currency, dan snapshot";
  } finally { formPending.value = false; }
}
async function remove(b: any) {
  if (!confirm(`Hapus booking ${b.bookingCode}?`)) return;
  await adminDelete(`/api/admin/tour/bookings/${b.id}`).catch(()=>{});
  await refresh();
}
</script>

<template>
  <div>
    <PageHead title="Bookings" subtitle="Booking vendor per Trip/Order — snapshot kurs, amountIdr server-authoritative, tidak recalc saat global rate berubah.">
      <template #actions><button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white" @click="openCreate">+ Tambah Booking</button></template>
    </PageHead>

    <div class="mt-6 flex flex-wrap gap-3">
      <input v-model="search" placeholder="Cari kode / deskripsi..." class="min-h-[44px] w-64 rounded-xl border border-neutral-line px-4 text-sm" @input="page=1" />
      <select v-model="status" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua Status</option><option v-for="s in STATUSES" :key="s" :value="s">{{ bookingStatusLabel(s) }}</option></select>
      <select v-model="bookingType" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua Tipe</option><option v-for="t in TYPES" :key="t" :value="t">{{ bookingTypeLabel(t) }}</option></select>
      <select v-model="vendorId" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua Vendor</option><option v-for="v in vendors" :key="v.id" :value="v.id">{{ v.vendorCode }} · {{ v.name }}</option></select>
    </div>

    <div v-if="showForm" class="mt-6 rounded-2xl border border-neutral-line bg-white p-6">
      <h3 class="font-heading text-base font-semibold">{{ form.id ? "Edit Booking" : "Tambah Booking" }}</h3>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label class="text-sm font-medium">Tanggal<input v-model="form.bookingDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" /></label>
        <label class="text-sm font-medium">Vendor<select v-model="form.vendorId" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"><option value="">Pilih Vendor...</option><option v-for="v in vendors" :key="v.id" :value="v.id">{{ v.vendorCode }} · {{ v.name }} ({{ v.defaultCurrency }})</option></select></label>
        <label class="text-sm font-medium">Trip (opsional)<select v-model="form.tripId" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"><option value="">Tanpa Trip</option><option v-for="t in trips" :key="t.id" :value="t.id">{{ t.tripCode }} · {{ t.name }}</option></select></label>
        <label class="text-sm font-medium">Order (opsional)<select v-model="form.orderId" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"><option value="">Tanpa Order</option><option v-for="o in orders" :key="o.id" :value="o.id">{{ o.orderCode }} · {{ o.customer?.name || o.customer?.customerCode || `#${o.customerId}` }} · {{ o.paxCount }} pax</option></select></label>
        <label class="text-sm font-medium">Tipe<select v-model="form.bookingType" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"><option v-for="t in TYPES" :key="t" :value="t">{{ bookingTypeLabel(t) }}</option></select></label>
        <label class="text-sm font-medium">Currency<select v-model="form.currency" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"><option>IDR</option><option>SAR</option><option>USD</option></select></label>
        <label class="text-sm font-medium">Amount<input v-model="form.amount" type="number" min="0" step="0.01" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" /></label>
        <label class="text-sm font-medium">Rate Snapshot (non-IDR)<input v-model="form.exchangeRateSnapshot" type="number" min="0" step="0.000001" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" placeholder="misal 4350 untuk SAR→IDR" /></label>
        <label class="text-sm font-medium">Due Date<input v-model="form.dueDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" /></label>
        <label class="text-sm font-medium">Status<select v-model="form.status" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"><option v-for="s in STATUSES" :key="s" :value="s">{{ bookingStatusLabel(s) }}</option></select></label>
        <label class="sm:col-span-2 text-sm font-medium">Deskripsi<textarea v-model="form.description" rows="2" class="mt-1 w-full rounded-xl border border-neutral-line px-4 py-2" /></label>
        <label class="sm:col-span-2 text-sm font-medium">Notes<textarea v-model="form.notes" rows="2" class="mt-1 w-full rounded-xl border border-neutral-line px-4 py-2" /></label>
      </div>
      <p v-if="formError" class="mt-3 rounded-xl border border-gold-soft bg-gold-sand/50 px-4 py-2 text-sm">{{ formError }}</p>
      <div class="mt-4 flex gap-2"><button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white" :disabled="formPending" @click="submit">Simpan</button><button type="button" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium" @click="showForm=false">Batal</button></div>
    </div>

    <div class="mt-6 overflow-x-auto rounded-2xl border border-neutral-line bg-white">
      <table class="w-full min-w-[1200px] text-left text-sm">
        <thead class="border-b bg-neutral-warm text-xs uppercase text-neutral-charcoal/60"><tr><th class="px-5 py-3">Kode / Vendor</th><th class="px-5 py-3">Tanggal</th><th class="px-5 py-3">Tipe</th><th class="px-5 py-3">Trip / Order / Customer</th><th class="px-5 py-3">Amount</th><th class="px-5 py-3">IDR (server)</th><th class="px-5 py-3">Status</th><th class="px-5 py-3 text-right">Aksi</th></tr></thead>
        <tbody class="divide-y">
          <tr v-for="b in rows" :key="b.id">
            <td class="px-5 py-3">
              <p class="font-mono text-xs font-semibold">{{ b.bookingCode }}</p>
              <p class="text-xs font-medium">{{ b.vendor?.name || `Vendor #${b.vendorId}` }} <span class="font-mono text-[11px] text-neutral-charcoal/50">{{ b.vendor?.vendorCode || "" }}</span> <span v-if="b.vendor?.deletedAt" class="rounded bg-amber-100 px-1 text-amber-700">Arsip</span></p>
            </td>
            <td class="px-5 py-3 text-xs">{{ b.bookingDate }}</td>
            <td class="px-5 py-3"><span class="rounded-full bg-neutral-warm px-2 py-1 text-xs">{{ bookingTypeLabel(b.bookingType) }}</span></td>
            <td class="px-5 py-3 text-xs">
              <p>{{ b.trip ? `${b.trip.tripCode} · ${b.trip.name}` : "—" }}</p>
              <p>{{ b.order ? `${b.order.orderCode} · ${b.order.paxCount} pax` : "—" }} <span v-if="b.customer" class="text-neutral-charcoal/50">· {{ b.customer.name }}</span></p>
            </td>
            <td class="px-5 py-3 text-xs">{{ b.amount }} {{ b.currency }} <span v-if="b.exchangeRateSnapshot" class="text-neutral-charcoal/50">×{{ b.exchangeRateSnapshot }}</span></td>
            <td class="px-5 py-3 font-medium">Rp {{ Number(b.amountIdr).toLocaleString('id-ID') }}</td>
            <td class="px-5 py-3"><span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="b.status==='CONFIRMED' ? 'bg-sht-olive/10 text-brand-green' : 'bg-neutral-warm text-neutral-charcoal/60'">{{ bookingStatusLabel(b.status) }}</span></td>
            <td class="px-5 py-3 text-right">
              <button class="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-teal hover:bg-sht-olive/5" @click="openEdit(b)">Edit</button>
              <NuxtLink :to="`/tour/bookings/${b.id}`" class="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-charcoal/60 hover:text-brand-green">Detail</NuxtLink>
              <button class="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-charcoal/50 hover:text-red-600" @click="remove(b)">Hapus</button>
            </td>
          </tr>
          <tr v-if="rows.length===0"><td colspan="8" class="px-5 py-10 text-center text-neutral-charcoal/50">Belum ada booking.</td></tr>
        </tbody>
      </table>
    </div>
    <div class="mt-4"><AdminPagination :page="meta.page" :page-count="meta.pageCount" :total="meta.total" @change="(n)=>page=n" /></div>
  </div>
</template>
