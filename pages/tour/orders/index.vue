<script setup lang="ts">
import type { TourOrder, TourCustomer } from "~/types";
definePageMeta({ layout: "admin", middleware: "admin-auth" });

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

const { data, pending, refresh } = await useAdminFetch<{ data: TourOrder[]; meta: any }>("/api/admin/tour/orders", { query });
const rows = computed(() => data.value?.data ?? []);
const meta = computed(() => data.value?.meta ?? { page: 1, pageSize: 20, total: 0, pageCount: 1 });

const { data: customersData } = await useAdminFetch<{ data: TourCustomer[]; meta: any }>("/api/admin/tour/customers", { query: { pageSize: 100 } });
const customers = computed(() => customersData.value?.data ?? []);

const { data: leadsData } = await useAdminFetch<{ data: any[] }>("/api/admin/leads");
const leads = computed(() => (leadsData.value as any)?.data ?? []);

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
  sellingPriceIdr: 0,
  notes: "",
});
const formError = ref<string | null>(null);
const formPending = ref(false);

function openCreate() {
  Object.assign(form, { id: null, orderDate: new Date().toISOString().slice(0,10), customerId: "", leadId: "", estimationId: "", orderType: "UMRAH_PACKAGE", packageName: "", serviceSummary: "", paxCount: 1, status: "DRAFT", sellingPriceIdr: 0, notes: "" });
  showForm.value = true;
}
function openEdit(o: TourOrder) {
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
      sellingPriceIdr: Number(form.sellingPriceIdr),
      notes: form.notes || null,
    };
    if (form.id) await adminPatch(`/api/admin/tour/orders/${form.id}`, body);
    else await adminPost("/api/admin/tour/orders", body);
    showForm.value = false;
    await refresh();
  } catch (err: any) {
    formError.value = err?.data?.statusMessage || "Gagal menyimpan";
  } finally { formPending.value = false; }
}
async function remove(o: TourOrder) {
  if (!confirm(`Hapus order ${o.orderCode}?`)) return;
  await adminDelete(`/api/admin/tour/orders/${o.id}`).catch(()=>{});
  await refresh();
}
</script>

<template>
  <div>
    <PageHead title="Orders" subtitle="Order = transaksi terkonfirmasi manual, bukan auto checkout. Bisa tanpa Lead/Estimation, optional link Lead→Order & Estimation→Order.">
      <template #actions><button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white" @click="openCreate">+ Buat Order</button></template>
    </PageHead>

    <div class="mt-6 flex flex-wrap gap-3">
      <input v-model="search" placeholder="Cari kode / paket..." class="min-h-[44px] w-64 rounded-xl border border-neutral-line px-4 text-sm" @input="page=1" />
      <select v-model="status" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua Status</option><option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option></select>
      <select v-model="orderType" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua Tipe</option><option v-for="t in ORDER_TYPES" :key="t" :value="t">{{ t }}</option></select>
    </div>

    <div v-if="showForm" class="mt-6 rounded-2xl border border-neutral-line bg-white p-6">
      <h3 class="font-heading text-base font-semibold">{{ form.id ? "Edit Order" : "Buat Order" }}</h3>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label class="text-sm font-medium">Tanggal<input v-model="form.orderDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" /></label>
        <label class="text-sm font-medium">Customer<select v-model="form.customerId" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"><option value="">Pilih Customer...</option><option v-for="c in customers" :key="c.id" :value="c.id">{{ c.customerCode }} · {{ c.name }}</option></select></label>
        <label class="text-sm font-medium">Lead (opsional)<select v-model="form.leadId" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"><option value="">Tanpa Lead</option><option v-for="l in leads" :key="l.id" :value="l.id">{{ l.name }} · {{ l.whatsapp }} ({{ l.status }})</option></select></label>
        <label class="text-sm font-medium">Estimation ID (opsional)<input v-model="form.estimationId" type="number" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" placeholder="ID estimasi" /></label>
        <label class="text-sm font-medium">Tipe Order<select v-model="form.orderType" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"><option v-for="t in ORDER_TYPES" :key="t" :value="t">{{ t }}</option></select></label>
        <label class="text-sm font-medium">Status<select v-model="form.status" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3"><option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option></select></label>
        <label class="text-sm font-medium">Package Name<input v-model="form.packageName" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" placeholder="Umroh 12D" /></label>
        <label class="text-sm font-medium">Pax Count<input v-model="form.paxCount" type="number" min="1" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" /></label>
        <label class="sm:col-span-2 text-sm font-medium">Service Summary<textarea v-model="form.serviceSummary" rows="2" class="mt-1 w-full rounded-xl border border-neutral-line px-4 py-2" placeholder="Ringkasan layanan" /></label>
        <label class="text-sm font-medium">Selling Price IDR<input v-model="form.sellingPriceIdr" type="number" min="0" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4" /></label>
        <label class="text-sm font-medium">Notes<textarea v-model="form.notes" rows="2" class="mt-1 w-full rounded-xl border border-neutral-line px-4 py-2" /></label>
      </div>
      <p v-if="formError" class="mt-3 rounded-xl border border-gold-soft bg-gold-sand/50 px-4 py-2 text-sm">{{ formError }}</p>
      <div class="mt-4 flex gap-2">
        <button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white" :disabled="formPending" @click="submit">Simpan</button>
        <button type="button" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium" @click="showForm=false">Batal</button>
      </div>
    </div>

    <div class="mt-6 overflow-x-auto rounded-2xl border border-neutral-line bg-white">
      <table class="w-full min-w-[1000px] text-left text-sm">
        <thead class="border-b bg-neutral-warm text-xs uppercase text-neutral-charcoal/60"><tr><th class="px-5 py-3">Kode</th><th class="px-5 py-3">Tanggal</th><th class="px-5 py-3">Customer</th><th class="px-5 py-3">Tipe</th><th class="px-5 py-3">Pax</th><th class="px-5 py-3">Harga IDR</th><th class="px-5 py-3">Status</th><th class="px-5 py-3 text-right">Aksi</th></tr></thead>
        <tbody class="divide-y">
          <tr v-for="o in rows" :key="o.id">
            <td class="px-5 py-3 font-mono text-xs font-semibold">{{ o.orderCode }}</td>
            <td class="px-5 py-3 text-xs">{{ o.orderDate }}</td>
            <td class="px-5 py-3 text-xs">#{{ o.customerId }}</td>
            <td class="px-5 py-3 text-xs">{{ o.orderType }}</td>
            <td class="px-5 py-3">{{ o.paxCount }}</td>
            <td class="px-5 py-3 font-medium">Rp {{ Number(o.sellingPriceIdr).toLocaleString('id-ID') }}</td>
            <td class="px-5 py-3"><span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="o.status==='CONFIRMED' ? 'bg-sht-olive/10 text-brand-green' : 'bg-neutral-warm text-neutral-charcoal/60'">{{ o.status }}</span></td>
            <td class="px-5 py-3 text-right">
              <button class="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-teal hover:bg-sht-olive/5" @click="openEdit(o)">Edit</button>
              <NuxtLink :to="`/tour/orders/${o.id}`" class="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-charcoal/60 hover:text-brand-green">Detail</NuxtLink>
              <button class="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-charcoal/50 hover:text-red-600" @click="remove(o)">Hapus</button>
            </td>
          </tr>
          <tr v-if="rows.length===0"><td colspan="8" class="px-5 py-10 text-center text-neutral-charcoal/50">Belum ada order. Buat manual tanpa Lead/Estimation diperbolehkan.</td></tr>
        </tbody>
      </table>
    </div>
    <div class="mt-4"><AdminPagination :page="meta.page" :page-count="meta.pageCount" :total="meta.total" @change="(n)=>page=n" /></div>
  </div>
</template>
