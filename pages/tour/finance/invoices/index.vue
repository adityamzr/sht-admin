<script setup lang="ts">
import { Pencil, Trash2, Eye } from 'lucide-vue-next'
definePageMeta({ layout: "admin", middleware: "admin-auth" });

const search = ref("");
const state = ref("");
const orderId = ref("");
const page = ref(1);
const pageSize = ref(20);
const query = computed(() => ({
  search: search.value || undefined,
  state: state.value || undefined,
  orderId: orderId.value ? Number(orderId.value) : undefined,
  page: page.value,
  pageSize: pageSize.value,
}));
const { data, refresh } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/invoices", { query });
const rows = computed(() => data.value?.data ?? []);
const meta = computed(() => data.value?.meta ?? { page: 1, pageSize: 20, total: 0, pageCount: 1 });

const { data: ordersData } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/orders", { query: { pageSize: 100 } });
const orders = computed(() => ordersData.value?.data ?? []);

const STATES = ["DRAFT","ISSUED","CANCELLED"];

const showForm = ref(false);
const form = reactive({
  id: null as number | null,
  orderId: "" as any,
  issueDate: new Date().toISOString().slice(0,10),
  dueDate: "",
  description: "",
  amountIdr: null as number | null,
  state: "DRAFT",
  notes: "",
});
const formError = ref<string | null>(null);
const formPending = ref(false);

const selectedOrder = computed(() => orders.value.find((o: any) => String(o.id) === String(form.orderId)));
const alreadyInvoiced = ref<number>(0);
const remaining = computed(() => {
  if (!selectedOrder.value) return null;
  const orderValue = Number(selectedOrder.value.sellingPriceIdr ?? 0);
  return orderValue - alreadyInvoiced.value;
});

async function loadOrderInvoiced() {
  if (!form.orderId) { alreadyInvoiced.value = 0; return; }
  try {
    const res: any = await $fetch(`/api/admin/tour/invoices`, { query: { orderId: Number(form.orderId), pageSize: 100 }, headers: import.meta.server ? useRequestHeaders(["cookie"]) : undefined });
    const data = res.data ?? [];
    // sum excluding cancelled and excluding current editing invoice
    alreadyInvoiced.value = data.filter((inv: any) => inv.state !== 'CANCELLED' && (!form.id || inv.id !== form.id)).reduce((s: number, inv: any) => s + Number(inv.amountIdr ?? 0), 0);
  } catch { alreadyInvoiced.value = 0; }
}
watch(() => form.orderId, loadOrderInvoiced);

function openCreate() {
  Object.assign(form, { id: null, orderId: "", issueDate: new Date().toISOString().slice(0,10), dueDate: "", description: "", amountIdr: null, state: "DRAFT", notes: "" });
  alreadyInvoiced.value = 0;
  showForm.value = true;
}
function openEdit(inv: any) {
  Object.assign(form, {
    id: inv.id,
    orderId: inv.orderId,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate || "",
    description: inv.description || "",
    amountIdr: inv.amountIdr,
    state: inv.state,
    notes: inv.notes || "",
  });
  showForm.value = true;
  loadOrderInvoiced();
}
async function submit() {
  formPending.value = true; formError.value = null;
  try {
    const body: any = {
      orderId: Number(form.orderId),
      issueDate: form.issueDate,
      dueDate: form.dueDate || null,
      description: form.description || null,
      amountIdr: Number(form.amountIdr),
      state: form.state,
      notes: form.notes || null,
    };
    if (form.id) await adminPatch(`/api/admin/tour/invoices/${form.id}`, body);
    else await adminPost("/api/admin/tour/invoices", body);
    showForm.value = false;
    await refresh();
  } catch (e: any) { formError.value = e?.data?.statusMessage || "Gagal menyimpan"; } finally { formPending.value = false; }
}
async function remove(inv: any) {
  if (inv.state === 'ISSUED') {
    if (!confirm(`Invoice ${inv.invoiceCode} sudah ISSUED. Yakin CANCEL bukan hapus? Klik OK untuk CANCEL, Cancel untuk batal.`)) return;
    try { await adminPatch(`/api/admin/tour/invoices/${inv.id}`, { state: 'CANCELLED' }); await refresh(); } catch (e: any) { alert(e?.data?.statusMessage || 'Gagal cancel'); }
    return;
  }
  if (!confirm(`Hapus invoice ${inv.invoiceCode}?`)) return;
  await adminDelete(`/api/admin/tour/invoices/${inv.id}`).catch(()=>{}); await refresh();
}
</script>

<template>
  <div>
    <PageHead title="Invoices" subtitle="Tagihan ke customer per Order. Payment status derived dari VERIFIED Payments.">
      <template #actions><button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white" @click="openCreate">+ Buat Invoice</button></template>
    </PageHead>

    <div class="mt-6 flex flex-wrap gap-3">
      <input v-model="search" placeholder="Cari kode / deskripsi..." class="min-h-[44px] w-64 rounded-xl border border-neutral-line px-4 text-sm" @input="page=1" />
      <select v-model="state" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua State</option><option v-for="s in STATES" :key="s" :value="s">{{ s }}</option></select>
      <select v-model="orderId" class="min-h-[44px] w-64 rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua Order</option><option v-for="o in orders" :key="o.id" :value="o.id">{{ o.orderCode }} · {{ o.customer?.name || o.customer?.customerCode || `Customer #${o.customerId}` }} · Rp{{ Number(o.sellingPriceIdr).toLocaleString('id-ID') }}</option></select>
    </div>

    <TourModal :open="showForm" :title="form.id ? 'Edit Invoice' : 'Buat Invoice'" subtitle="Satu Order bisa punya banyak Invoice" max-width="max-w-2xl" @close="showForm=false">
      <div class="space-y-5">
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Order</h4>
          <label class="mt-3 block text-sm font-medium">Order *
            <select v-model="form.orderId" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm">
              <option value="">Pilih Order...</option>
              <option v-for="o in orders" :key="o.id" :value="o.id">{{ o.orderCode }} · {{ o.customer?.name || o.customer?.customerCode || `Customer #${o.customerId}` }} · Rp{{ Number(o.sellingPriceIdr).toLocaleString('id-ID') }}</option>
            </select>
          </label>
          <div v-if="selectedOrder" class="mt-3 rounded-xl bg-neutral-warm/60 px-4 py-3 text-xs">
            <p>Order Value: <span class="font-semibold">Rp {{ Number(selectedOrder.sellingPriceIdr).toLocaleString('id-ID') }}</span></p>
            <p>Already Invoiced: <span class="font-semibold">Rp {{ Number(alreadyInvoiced).toLocaleString('id-ID') }}</span></p>
            <p v-if="remaining !== null">Remaining Uninvoiced: <span class="font-semibold" :class="(remaining || 0) < 0 ? 'text-red-600' : 'text-emerald-700'">Rp {{ Number(remaining).toLocaleString('id-ID') }}</span></p>
            <p v-if="remaining !== null && (remaining || 0) < 0" class="mt-1 text-amber-700">⚠️ Total invoice melebihi Order value. Periksa kembali.</p>
          </div>
        </div>
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Invoice</h4>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-sm font-medium">Issue Date *<input v-model="form.issueDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" /></label>
            <label class="text-sm font-medium">Due Date<input v-model="form.dueDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" /></label>
            <label class="sm:col-span-2 text-sm font-medium">Description<input v-model="form.description" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" placeholder="DP 50%, Pelunasan, dll" /></label>
            <label class="text-sm font-medium">Amount (IDR) *<TourMoneyInput v-model="form.amountIdr" currency="IDR" placeholder="0" /></label>
            <label class="text-sm font-medium">State<select v-model="form.state" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm"><option v-for="s in STATES" :key="s" :value="s">{{ s }}</option></select></label>
            <label class="sm:col-span-2 text-sm font-medium">Notes<textarea v-model="form.notes" rows="2" class="mt-1 w-full rounded-xl border border-neutral-line px-4 py-2 text-sm" /></label>
          </div>
        </div>
        <p v-if="formError" class="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{{ formError }}</p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="min-h-[40px] rounded-xl border px-4 py-2 text-sm" @click="showForm=false">Batal</button>
          <button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-5 py-2 text-sm font-semibold text-white" :disabled="formPending" @click="submit">Simpan Invoice</button>
        </div>
      </template>
    </TourModal>

    <div class="mt-6 overflow-x-auto rounded-2xl border border-neutral-line bg-white">
      <table class="w-full min-w-[1100px] text-left text-sm">
        <thead class="border-b bg-neutral-warm text-xs uppercase text-neutral-charcoal/60"><tr><th class="px-5 py-3">Invoice</th><th class="px-5 py-3">Order / Customer</th><th class="px-5 py-3">Issue / Due</th><th class="px-5 py-3">Amount</th><th class="px-5 py-3">Paid</th><th class="px-5 py-3">Outstanding</th><th class="px-5 py-3">Payment Status</th><th class="px-5 py-3">State</th><th class="px-5 py-3 text-right">Aksi</th></tr></thead>
        <tbody class="divide-y">
          <tr v-for="inv in rows" :key="inv.id">
            <td class="px-5 py-3"><p class="font-mono text-xs font-semibold">{{ inv.invoiceCode }}</p><p class="text-xs text-neutral-charcoal/50">{{ inv.description || '—' }}</p></td>
            <td class="px-5 py-3 text-xs"><p class="font-medium">{{ inv.order ? `${inv.order.orderCode}` : `Order #${inv.orderId}` }}</p><p class="text-neutral-charcoal/60">{{ inv.customer?.name || '' }} · {{ inv.customer?.customerCode || '' }}</p></td>
            <td class="px-5 py-3 text-xs">{{ inv.issueDate }}<br/><span class="text-neutral-charcoal/50">Due {{ inv.dueDate || '—' }}</span></td>
            <td class="px-5 py-3 text-xs font-semibold">Rp {{ Number(inv.amountIdr).toLocaleString('id-ID') }}</td>
            <td class="px-5 py-3 text-xs text-emerald-700">Rp {{ Number(inv.totalPaid || 0).toLocaleString('id-ID') }}</td>
            <td class="px-5 py-3 text-xs font-semibold" :class="(inv.outstanding || 0) > 0 ? 'text-amber-700' : 'text-emerald-700'">Rp {{ Number(inv.outstanding || 0).toLocaleString('id-ID') }}</td>
            <td class="px-5 py-3"><TourStatusBadge :status="inv.paymentStatus || 'UNPAID'" type="paymentStatus" /></td>
            <td class="px-5 py-3"><TourStatusBadge :status="inv.state" type="invoice" /></td>
            <td class="px-5 py-3 text-right">
              <div class="flex justify-end gap-1">
                <button class="rounded-xl p-2 text-neutral-charcoal/60 hover:bg-neutral-warm" title="Edit" @click="openEdit(inv)"><Pencil class="h-4 w-4" /></button>
                <button class="rounded-xl p-2 text-neutral-charcoal/40 hover:bg-red-50 hover:text-red-600" title="Hapus/Cancel" @click="remove(inv)"><Trash2 class="h-4 w-4" /></button>
              </div>
            </td>
          </tr>
          <tr v-if="rows.length===0"><td colspan="9" class="px-5 py-10 text-center text-neutral-charcoal/50">Belum ada invoice.</td></tr>
        </tbody>
      </table>
    </div>
    <div class="mt-4"><AdminPagination :page="meta.page" :page-count="meta.pageCount" :total="meta.total" @change="(n)=>page=n" /></div>
  </div>
</template>
