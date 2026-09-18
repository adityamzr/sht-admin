<script setup lang="ts">
import type { TourOrder, TourCustomer } from "~/types";
import { Pencil, Trash2, Eye } from 'lucide-vue-next'
definePageMeta({ layout: "admin", middleware: "admin-auth" });
const { orderTypeLabel, orderStatusLabel } = useTourLabels();

const search = ref("");
const status = ref("");
const orderType = ref("");
const page = ref(1);
const pageSize = ref(20);

const query = computed(() => ({
  search: search.value || undefined,
  status: status.value || undefined,
  orderType: orderType.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
}));

const { data, pending, refresh } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/orders", { query });
const rows = computed(() => data.value?.data ?? []);
const meta = computed(() => data.value?.meta ?? { page: 1, pageSize: 20, total: 0, pageCount: 1 });

const { data: customersData } = await useAdminFetch<{ data: TourCustomer[]; meta: any }>("/api/admin/tour/customers", { query: { pageSize: 100 } });
const customers = computed(() => customersData.value?.data ?? []);

const { data: leadsData } = await useAdminFetch<{ data: any[] }>("/api/admin/leads");
const leads = computed(() => (leadsData.value as any)?.data ?? []);

const { data: estimationsData } = await useAdminFetch<{ data: any[] }>("/api/admin/estimations");
const estimations = computed(() => (estimationsData.value as any)?.data ?? []);

const STATUSES = ["DRAFT","CONFIRMED","IN_PROGRESS","COMPLETED","CANCELLED"];
const ORDER_TYPES = ["UMRAH_PACKAGE","CUSTOM_PRIVATE","LAND_ARRANGEMENT","SERVICE_ONLY"];

const showForm = ref(false);
const form = reactive({
  id: null as number | null,
  orderDate: new Date().toISOString().slice(0,10),
  customerId: "" as any,
  leadId: "" as any,
  estimationId: "" as any,
  orderType: "UMRAH_PACKAGE",
  packageName: "",
  serviceSummary: "",
  paxCount: 1,
  status: "DRAFT",
  sellingPriceIdr: null as number | null,
  notes: "",
});
const formError = ref<string | null>(null);
const formPending = ref(false);

function openCreate() {
  Object.assign(form, { id: null, orderDate: new Date().toISOString().slice(0,10), customerId: "", leadId: "", estimationId: "", orderType: "UMRAH_PACKAGE", packageName: "", serviceSummary: "", paxCount: 1, status: "DRAFT", sellingPriceIdr: null, notes: "" });
  showForm.value = true;
}
function openEdit(o: any) {
  Object.assign(form, {
    id: o.id,
    orderDate: o.orderDate,
    customerId: o.customerId,
    leadId: o.leadId || "",
    estimationId: o.estimationId || "",
    orderType: o.orderType,
    packageName: o.packageName || "",
    serviceSummary: o.serviceSummary,
    paxCount: o.paxCount,
    status: o.status,
    sellingPriceIdr: o.sellingPriceIdr,
    notes: o.notes || "",
  });
  showForm.value = true;
}
async function submit() {
  formPending.value = true;
  formError.value = null;
  try {
    const body: any = {
      orderDate: form.orderDate,
      customerId: Number(form.customerId),
      leadId: form.leadId ? Number(form.leadId) : null,
      estimationId: form.estimationId ? Number(form.estimationId) : null,
      orderType: form.orderType,
      packageName: form.packageName || null,
      serviceSummary: form.serviceSummary,
      paxCount: Number(form.paxCount),
      status: form.status,
      sellingPriceIdr: form.sellingPriceIdr !== null ? Number(form.sellingPriceIdr) : 0,
      notes: form.notes || null,
    };
    if (form.id) await adminPatch(`/api/admin/tour/orders/${form.id}`, body);
    else await adminPost("/api/admin/tour/orders", body);
    showForm.value = false;
    await refresh();
  } catch (err: any) {
    formError.value = err?.data?.statusMessage || err?.message || "Gagal menyimpan";
  } finally { formPending.value = false; }
}
async function remove(o: any) {
  if (!confirm(`Hapus order ${o.orderCode}?`)) return;
  await adminDelete(`/api/admin/tour/orders/${o.id}`).catch(()=>{});
  await refresh();
}
</script>

<template>
  <div>
    <PageHead title="Orders" subtitle="ORDER VALUE = selling price. Customer→Order→Bookings/Vendors/Expenses & Invoices→Payments→Overview/Profitability/Reports. Order MUST ref existing Customer.">
      <template #actions><button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white" @click="openCreate">+ Buat Order</button></template>
    </PageHead>

    <div class="mt-6 flex flex-wrap gap-3">
      <input v-model="search" placeholder="Cari kode / paket..." class="min-h-[44px] w-64 rounded-xl border border-neutral-line px-4 text-sm" @input="page=1" />
      <select v-model="status" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua Status</option><option v-for="s in STATUSES" :key="s" :value="s">{{ orderStatusLabel(s) }}</option></select>
      <select v-model="orderType" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua Tipe</option><option v-for="t in ORDER_TYPES" :key="t" :value="t">{{ orderTypeLabel(t) }}</option></select>
    </div>

    <TourModal :open="showForm" :title="form.id ? 'Edit Order' : 'Buat Order'" subtitle="Pesanan terkonfirmasi, bisa tanpa Lead/Estimasi" max-width="max-w-3xl" @close="showForm=false">
      <div class="space-y-6">
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Informasi Pesanan</h4>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-sm font-medium">Customer * (required, dependency)
              <select v-model="form.customerId" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm"><option value="">Pilih Customer...</option><option v-for="c in customers" :key="c.id" :value="c.id">{{ c.customerCode }} · {{ c.name }}</option></select>
              <span class="mt-1 block text-[11px] text-neutral-charcoal/50">Order MUST ref existing Customer. Buat Customer dulu sebelum Order. No anonymous Order.</span>
              <span v-if="!customers.length" class="mt-1 block text-[11px] text-red-600">Belum ada Customer. <NuxtLink to="/tour/customers" class="underline font-semibold">Create a Customer before creating an Order.</NuxtLink></span>
            </label>
            <label class="text-sm font-medium">Tanggal Pesanan<input v-model="form.orderDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" /></label>
            <label class="text-sm font-medium">Jenis Pesanan<select v-model="form.orderType" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm"><option v-for="t in ORDER_TYPES" :key="t" :value="t">{{ orderTypeLabel(t) }}</option></select></label>
            <label class="text-sm font-medium">Jumlah Pax<input v-model.number="form.paxCount" type="number" min="1" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" /></label>
            <label class="text-sm font-medium">Nama Paket<input v-model="form.packageName" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" placeholder="Umrah 14 Hari Turkey" /></label>
            <label class="sm:col-span-2 text-sm font-medium">Ringkasan Layanan<textarea v-model="form.serviceSummary" rows="2" class="mt-1 w-full rounded-xl border border-neutral-line px-4 py-2 text-sm" placeholder="Perjalanan umrah + turki selama 14 hari" /></label>
          </div>
        </div>

        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Nilai & Status</h4>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-sm font-medium">Harga Jual IDR<TourMoneyInput v-model="form.sellingPriceIdr" currency="IDR" placeholder="0" /></label>
            <label class="text-sm font-medium">Status<select v-model="form.status" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm"><option v-for="s in STATUSES" :key="s" :value="s">{{ orderStatusLabel(s) }}</option></select></label>
          </div>
        </div>

        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Referensi Opsional</h4>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-sm font-medium">Lead<select v-model="form.leadId" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm"><option value="">Tanpa Lead (manual)</option><option v-for="l in leads" :key="l.id" :value="l.id">{{ l.name }} · {{ l.whatsapp }} ({{ l.status }})</option></select></label>
            <label class="text-sm font-medium">Estimasi<select v-model="form.estimationId" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm"><option value="">Tanpa Estimasi</option><option v-for="e in estimations" :key="e.id" :value="e.id">{{ e.estimationNumber }} · {{ e.pilgrims }} pax · Rp {{ Number(e.totalAmount||0).toLocaleString('id-ID') }}</option></select></label>
          </div>
        </div>

        <label class="block text-sm font-medium">Catatan<textarea v-model="form.notes" rows="2" class="mt-1 w-full rounded-xl border border-neutral-line px-4 py-2 text-sm" /></label>
        <p v-if="formError" class="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{{ formError }}</p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="min-h-[40px] rounded-xl border px-4 py-2 text-sm" @click="showForm=false">Batal</button>
          <button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-5 py-2 text-sm font-semibold text-white" :disabled="formPending" @click="submit">Simpan</button>
        </div>
      </template>
    </TourModal>

    <div class="mt-6 overflow-x-auto rounded-2xl border border-neutral-line bg-white">
      <table class="w-full min-w-[1100px] text-left text-sm">
        <thead class="border-b bg-neutral-warm text-xs uppercase text-neutral-charcoal/60"><tr><th class="px-5 py-3">Kode / Paket</th><th class="px-5 py-3">Tanggal</th><th class="px-5 py-3">Customer</th><th class="px-5 py-3">Tipe</th><th class="px-5 py-3">Pax</th><th class="px-5 py-3">Harga</th><th class="px-5 py-3">Status</th><th class="px-5 py-3 text-right">Aksi</th></tr></thead>
        <tbody class="divide-y">
          <tr v-for="o in rows" :key="o.id">
            <td class="px-5 py-3"><p class="font-mono text-xs font-semibold">{{ o.orderCode }}</p><p class="text-[11px] text-neutral-charcoal/60">{{ o.packageName || o.serviceSummary?.slice(0,40) || "—" }}</p></td>
            <td class="px-5 py-3 text-xs">{{ o.orderDate }}</td>
            <td class="px-5 py-3 text-xs"><p class="font-medium">{{ o.customer?.name || `Customer #${o.customerId}` }}</p><p class="font-mono text-[11px] text-neutral-charcoal/50">{{ o.customer?.customerCode || "" }} <span v-if="o.customer?.deletedAt" class="rounded bg-amber-100 px-1 text-amber-700">Arsip</span></p></td>
            <td class="px-5 py-3 text-xs">{{ orderTypeLabel(o.orderType) }}</td>
            <td class="px-5 py-3">{{ o.paxCount }} pax</td>
            <td class="px-5 py-3 font-medium">Rp {{ Number(o.sellingPriceIdr).toLocaleString('id-ID') }}</td>
            <td class="px-5 py-3"><TourStatusBadge :status="o.status" type="order" /></td>
            <td class="px-5 py-3 text-right">
              <div class="flex justify-end gap-1">
                <button class="rounded-xl p-2 text-neutral-charcoal/60 hover:bg-neutral-warm" title="Edit" @click="openEdit(o)"><Pencil class="h-4 w-4" /></button>
                <NuxtLink :to="`/tour/orders/${o.id}`" class="rounded-xl p-2 text-neutral-charcoal/50 hover:bg-neutral-warm hover:text-brand-green" title="Detail"><Eye class="h-4 w-4" /></NuxtLink>
                <button class="rounded-xl p-2 text-neutral-charcoal/40 hover:bg-red-50 hover:text-red-600" title="Hapus" @click="remove(o)"><Trash2 class="h-4 w-4" /></button>
              </div>
            </td>
          </tr>
          <tr v-if="rows.length===0"><td colspan="8" class="px-5 py-10 text-center text-neutral-charcoal/50">Belum ada order.</td></tr>
        </tbody>
      </table>
    </div>
    <div class="mt-4"><AdminPagination :page="meta.page" :page-count="meta.pageCount" :total="meta.total" @change="(n)=>page=n" /></div>
  </div>
</template>
