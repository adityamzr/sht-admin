<script setup lang="ts">
import { Pencil, Trash2, Eye, Send, Ban, CircleSlash } from 'lucide-vue-next'
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

const STATES_FILTER = ["DRAFT","ISSUED","CANCELLED"];
const STATES_CREATE = ["DRAFT","ISSUED"]; // no CANCELLED on create per hardening

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
    // ISSUED only counts as receivable per hardening, but for guidance sum ISSUED
    alreadyInvoiced.value = data.filter((inv: any) => inv.state === 'ISSUED' && (!form.id || inv.id !== form.id)).reduce((s: number, inv: any) => s + Number(inv.amountIdr ?? 0), 0);
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
    if (form.state === 'CANCELLED') throw new Error('CANCELLED hanya via aksi Cancel explicit, tidak dari form create');
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
  } catch (e: any) { formError.value = e?.data?.statusMessage || e.message || "Gagal menyimpan"; } finally { formPending.value = false; }
}

const showCancelModal = ref(false);
const cancelTarget = ref<any>(null);
const cancelPending = ref(false);
function openCancel(inv: any) {
  cancelTarget.value = inv;
  showCancelModal.value = true;
}
async function confirmCancel() {
  if (!cancelTarget.value) return;
  cancelPending.value = true;
  try {
    await adminPatch(`/api/admin/tour/invoices/${cancelTarget.value.id}`, { state: 'CANCELLED' });
    showCancelModal.value = false;
    await refresh();
  } catch (e: any) { alert(e?.data?.statusMessage || e.message || 'Gagal cancel'); } finally { cancelPending.value = false; }
}

async function issueInvoice(inv: any) {
  if (!confirm(`Issue Invoice ${inv.invoiceCode}? Setelah ISSUED akan masuk piutang dan bisa terima Payment VERIFIED.`)) return;
  try { await adminPatch(`/api/admin/tour/invoices/${inv.id}`, { state: 'ISSUED' }); await refresh(); } catch (e: any) { alert(e?.data?.statusMessage || e.message || 'Gagal issue'); }
}

async function removeDraft(inv: any) {
  if (inv.state !== 'DRAFT') { alert('Hanya DRAFT yang bisa dihapus. ISSUED harus Cancel.'); return; }
  if (!confirm(`Hapus DRAFT invoice ${inv.invoiceCode}?`)) return;
  await adminDelete(`/api/admin/tour/invoices/${inv.id}`).catch(()=>{});
  await refresh();
}
</script>

<template>
  <div>
    <PageHead title="Invoices" subtitle="INVOICE = billing/tagihan. Hanya ISSUED yang masuk piutang. DRAFT tidak dihitung. CANCELLED terminal tidak bisa dibuka lagi.">
      <template #actions><button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white" @click="openCreate">+ Buat Invoice</button></template>
    </PageHead>

    <div class="mt-6 flex flex-wrap gap-3">
      <input v-model="search" placeholder="Cari kode / deskripsi..." class="min-h-[44px] w-64 rounded-xl border border-neutral-line px-4 text-sm" @input="page=1" />
      <select v-model="state" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua State</option><option v-for="s in STATES_FILTER" :key="s" :value="s">{{ s }}</option></select>
      <select v-model="orderId" class="min-h-[44px] w-64 rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua Order</option><option v-for="o in orders" :key="o.id" :value="o.id">{{ o.orderCode }} · {{ o.customer?.name || o.customer?.customerCode || `Customer #${o.customerId}` }} · Rp{{ Number(o.sellingPriceIdr).toLocaleString('id-ID') }}</option></select>
    </div>

    <div class="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-800">
      <p><strong>Dependency:</strong> Buat Order dulu sebelum Invoice. <NuxtLink to="/tour/orders" class="font-semibold underline">Ke Orders →</NuxtLink> Invoice Order harus milik workspace Tour yang sama.</p>
      <p class="mt-1"><strong>Workflow:</strong> DRAFT editable deletable NOT receivable → ISSUED billed receivable bisa terima Payment → CANCELLED historical excluded no Payment no reopen.</p>
    </div>

    <TourModal :open="showForm" :title="form.id ? 'Edit Invoice' : 'Buat Invoice'" subtitle="INVOICE = billing. Hanya ISSUED masuk Outstanding/Profitability/Reports. DRAFT excluded." max-width="max-w-2xl" @close="showForm=false">
      <div class="space-y-5">
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Order (required)</h4>
          <label class="mt-3 block text-sm font-medium">Order *
            <select v-model="form.orderId" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm">
              <option value="">Pilih Order...</option>
              <option v-for="o in orders" :key="o.id" :value="o.id">{{ o.orderCode }} · {{ o.customer?.name || o.customer?.customerCode || `Customer #${o.customerId}` }} · Rp{{ Number(o.sellingPriceIdr).toLocaleString('id-ID') }}</option>
            </select>
          </label>
          <p v-if="!orders.length" class="mt-2 text-xs text-red-600">Belum ada Order. <NuxtLink to="/tour/orders" class="underline">Buat Order dulu — Order MUST ref existing Customer.</NuxtLink></p>
          <div v-if="selectedOrder" class="mt-3 rounded-xl bg-neutral-warm/60 px-4 py-3 text-xs">
            <p>ORDER VALUE (sellingPrice): <span class="font-semibold">Rp {{ Number(selectedOrder.sellingPriceIdr).toLocaleString('id-ID') }}</span></p>
            <p>Already Invoiced ISSUED: <span class="font-semibold">Rp {{ Number(alreadyInvoiced).toLocaleString('id-ID') }}</span></p>
            <p v-if="remaining !== null">Remaining Uninvoiced: <span class="font-semibold" :class="(remaining || 0) < 0 ? 'text-red-600' : 'text-emerald-700'">Rp {{ Number(remaining).toLocaleString('id-ID') }}</span></p>
          </div>
        </div>
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Invoice</h4>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-sm font-medium">Issue Date *<input v-model="form.issueDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" /></label>
            <label class="text-sm font-medium">Due Date<input v-model="form.dueDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" /></label>
            <label class="sm:col-span-2 text-sm font-medium">Description<input v-model="form.description" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" placeholder="DP 30%, Pelunasan, dll" /></label>
            <label class="text-sm font-medium">Amount (IDR) *<TourMoneyInput v-model="form.amountIdr" currency="IDR" placeholder="0" /></label>
            <label class="text-sm font-medium">State (Create)
              <select v-model="form.state" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm">
                <option v-for="s in STATES_CREATE" :key="s" :value="s">{{ s }}</option>
                <option v-if="form.id && form.state==='CANCELLED'" value="CANCELLED">CANCELLED (read-only)</option>
              </select>
              <span class="mt-1 block text-[11px] text-neutral-charcoal/50">Create hanya DRAFT/ISSUED. CANCEL via aksi explicit.</span>
            </label>
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

    <!-- Cancel Confirmation Modal -->
    <TourModal :open="showCancelModal" title="Cancel Invoice" subtitle="CANCELLED terminal tidak bisa dibuka kembali" max-width="max-w-md" @close="showCancelModal=false">
      <div class="space-y-3 text-sm">
        <p>Yakin Cancel Invoice <span class="font-mono font-semibold">{{ cancelTarget?.invoiceCode }}</span>?</p>
        <p class="text-xs text-neutral-charcoal/60">ISSUED → CANCELLED: invoice akan historical excluded, tidak bisa terima Payment, tidak bisa reopen (terminal V1). DRAFT harus delete bukan cancel.</p>
        <div class="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">CANCELLED excluded dari Outstanding, Overdue, Profitability, Reports.</div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button class="min-h-[40px] rounded-xl border px-4 py-2 text-sm" @click="showCancelModal=false">Batal</button>
          <button class="min-h-[40px] rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white" :disabled="cancelPending" @click="confirmCancel">Ya, Cancel Invoice</button>
        </div>
      </template>
    </TourModal>

    <div class="admin-table-scroll mt-6 rounded-2xl border border-neutral-line bg-white">
      <table class="admin-data-table min-w-[1080px] text-left text-sm">
        <thead class="border-b border-neutral-line"><tr><th class="px-5 py-3">Invoice</th><th class="px-5 py-3">Order / Customer</th><th class="px-5 py-3">Issue / Due</th><th class="px-5 py-3">Amount</th><th class="px-5 py-3">Paid VERIFIED</th><th class="px-5 py-3">Outstanding</th><th class="px-5 py-3">Payment Status</th><th class="px-5 py-3">State</th><th class="admin-table-actions px-5 py-3 text-right">Aksi</th></tr></thead>
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
          <td class="admin-table-actions px-5 py-3 text-right">
              <div class="flex justify-end gap-1">
                <NuxtLink :to="`/tour/finance/payments?invoiceId=${inv.id}`" class="rounded-xl p-2 text-neutral-charcoal/50 hover:bg-neutral-warm hover:text-brand-green" title="Lihat Payments" aria-label="View payments"><Eye class="h-4 w-4" /></NuxtLink>
                <button v-if="inv.state==='DRAFT'" class="rounded-xl p-2 text-neutral-charcoal/60 hover:bg-neutral-warm" title="Edit DRAFT" aria-label="Edit" @click="openEdit(inv)"><Pencil class="h-4 w-4" /></button>
                <button v-if="inv.state==='DRAFT'" class="rounded-xl p-2 text-emerald-600 hover:bg-emerald-50" title="Issue → ISSUED (masuk piutang)" aria-label="Issue" @click="issueInvoice(inv)"><Send class="h-4 w-4" /></button>
                <button v-if="inv.state==='DRAFT'" class="rounded-xl p-2 text-neutral-charcoal/40 hover:bg-red-50 hover:text-red-600" title="Delete DRAFT" aria-label="Delete draft" @click="removeDraft(inv)"><Trash2 class="h-4 w-4" /></button>
                <button v-if="inv.state==='ISSUED'" class="rounded-xl p-2 text-red-600 hover:bg-red-50" title="Cancel → CANCELLED terminal" aria-label="Cancel" @click="openCancel(inv)"><Ban class="h-4 w-4" /></button>
                <span v-if="inv.state==='CANCELLED'" class="rounded-xl p-2 text-neutral-charcoal/30" title="Cancelled read-only" aria-label="Cancelled"><CircleSlash class="h-4 w-4" /></span>
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
