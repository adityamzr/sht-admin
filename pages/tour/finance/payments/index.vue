<script setup lang="ts">
import { Pencil, Trash2, Eye, BadgeCheck, Ban, CircleSlash } from 'lucide-vue-next'
definePageMeta({ layout: "admin", middleware: "admin-auth" });

const search = ref("");
const status = ref("");
const method = ref("");
const page = ref(1);
const pageSize = ref(20);
const query = computed(() => ({
  search: search.value || undefined,
  status: status.value || undefined,
  method: method.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
}));
const { data, refresh } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/payments", { query });
const rows = computed(() => data.value?.data ?? []);
const meta = computed(() => data.value?.meta ?? { page: 1, pageSize: 20, total: 0, pageCount: 1 });

const { data: invoicesData, refresh: refreshEligible } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/invoices/eligible", { query: { pageSize: 100 } });
const eligibleInvoices = computed(() => invoicesData.value?.data ?? []);
const { data: invoicesAllData } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/invoices", { query: { pageSize: 100 } });
const invoicesAll = computed(() => invoicesAllData.value?.data ?? []);

const STATUSES_FILTER = ["DRAFT","VERIFIED","VOID"];
const STATUSES_CREATE = ["DRAFT","VERIFIED"]; // no VOID on create
const METHODS = ["BANK_TRANSFER","CASH","QRIS","OTHER"];

const showForm = ref(false);
const form = reactive({
  id: null as number | null,
  invoiceId: "" as any,
  paymentDate: new Date().toISOString().slice(0,10),
  amountIdr: null as number | null,
  method: "BANK_TRANSFER",
  accountOrChannel: "",
  referenceNumber: "",
  proofUrl: "",
  status: "DRAFT",
  notes: "",
});
const formError = ref<string | null>(null);
const formPending = ref(false);

const selectedInvoice = computed(() => {
  const all = [...eligibleInvoices.value, ...invoicesAll.value];
  const uniq: Record<string, any> = {};
  for (const inv of all) uniq[String(inv.id)] = inv;
  return uniq[String(form.invoiceId)] || null;
});

const paymentInvoiceOptions = computed(() => {
  const base = [...eligibleInvoices.value];
  if (form.id && form.invoiceId) {
    const currentId = String(form.invoiceId);
    const already = base.some((inv: any) => String(inv.id) === currentId);
    if (!already) {
      const fromAll = invoicesAll.value.find((i: any) => String(i.id) === currentId);
      if (fromAll) base.unshift(fromAll);
      else if (selectedInvoice.value) base.unshift(selectedInvoice.value);
    }
  }
  return base;
});

const outstandingForSelected = computed(() => {
  if (!selectedInvoice.value) return null;
  return Number(selectedInvoice.value.outstanding ?? 0);
});

const invoiceLabel = (inv: any) => {
  const code = inv.invoiceCode || `INV-${inv.id}`;
  const order = inv.order?.orderCode || (inv.orderId ? `ORD-${inv.orderId}` : '');
  const cust = inv.customer?.name || inv.customerName || '';
  const amount = `Rp${Number(inv.amountIdr).toLocaleString('id-ID')}`;
  const outstanding = `Rp${Number(inv.outstanding ?? 0).toLocaleString('id-ID')}`;
  const payStatus = inv.paymentStatus || inv.state || 'UNPAID';
  // Human-readable: INV-xxx · ORD-xxx · Name · Invoice RpX · Outstanding RpY · UNPAID/PARTIAL
  const parts = [code];
  if (order) parts.push(order);
  if (cust) parts.push(cust);
  parts.push(`Invoice ${amount}`);
  parts.push(`Outstanding ${outstanding}`);
  parts.push(payStatus);
  return parts.join(' · ');
};

function openCreate() {
  Object.assign(form, { id: null, invoiceId: "", paymentDate: new Date().toISOString().slice(0,10), amountIdr: null, method: "BANK_TRANSFER", accountOrChannel: "", referenceNumber: "", proofUrl: "", status: "DRAFT", notes: "" });
  showForm.value = true;
}
function openEdit(p: any) {
  Object.assign(form, {
    id: p.id,
    invoiceId: p.invoiceId,
    paymentDate: p.paymentDate,
    amountIdr: p.amountIdr,
    method: p.method,
    accountOrChannel: p.accountOrChannel || "",
    referenceNumber: p.referenceNumber || "",
    proofUrl: p.proofUrl || "",
    status: p.status,
    notes: p.notes || "",
  });
  showForm.value = true;
}
async function submit() {
  formPending.value = true; formError.value = null;
  try {
    if (form.status === 'VOID') throw new Error('VOID hanya via aksi Void explicit, tidak dari form create');
    if (!form.invoiceId) throw new Error('Pilih Invoice ISSUED yang memiliki sisa tagihan');
    if (!form.amountIdr || Number(form.amountIdr) <= 0) throw new Error('Nominal pembayaran harus > 0');
    // Frontend validation: if VERIFIED, amount <= outstanding (informational, server authoritative)
    if (form.status === 'VERIFIED' && outstandingForSelected.value !== null) {
      if (Number(form.amountIdr) > outstandingForSelected.value) {
        throw new Error(`Nominal pembayaran melebihi sisa tagihan Rp${outstandingForSelected.value.toLocaleString('id-ID')}.`);
      }
    }
    const body: any = {
      invoiceId: Number(form.invoiceId),
      paymentDate: form.paymentDate,
      amountIdr: Number(form.amountIdr),
      method: form.method,
      accountOrChannel: form.accountOrChannel || null,
      referenceNumber: form.referenceNumber || null,
      proofUrl: form.proofUrl || null,
      status: form.status,
      notes: form.notes || null,
    };
    if (form.id) await adminPatch(`/api/admin/tour/payments/${form.id}`, body);
    else await adminPost("/api/admin/tour/payments", body);
    showForm.value = false;
    await Promise.all([refresh(), refreshEligible()]);
  } catch (e: any) { formError.value = e?.data?.statusMessage || e.message || "Gagal menyimpan"; } finally { formPending.value = false; }
}

// Verify / Void modals
const showVerifyModal = ref(false);
const verifyTarget = ref<any>(null);
const verifyPending = ref(false);
function openVerify(p: any) { verifyTarget.value = p; showVerifyModal.value = true; }
async function confirmVerify() {
  if (!verifyTarget.value) return;
  verifyPending.value = true;
  try { await adminPatch(`/api/admin/tour/payments/${verifyTarget.value.id}`, { status: 'VERIFIED' }); showVerifyModal.value = false; await Promise.all([refresh(), refreshEligible()]); }
  catch (e: any) { alert(e?.data?.statusMessage || e.message || 'Gagal verify'); } finally { verifyPending.value = false; }
}
const showVoidModal = ref(false);
const voidTarget = ref<any>(null);
const voidPending = ref(false);
function openVoid(p: any) { voidTarget.value = p; showVoidModal.value = true; }
async function confirmVoid() {
  if (!voidTarget.value) return;
  voidPending.value = true;
  try { await adminPatch(`/api/admin/tour/payments/${voidTarget.value.id}`, { status: 'VOID' }); showVoidModal.value = false; await Promise.all([refresh(), refreshEligible()]); }
  catch (e: any) { alert(e?.data?.statusMessage || e.message || 'Gagal void'); } finally { voidPending.value = false; }
}
async function removeDraft(p: any) {
  if (p.status !== 'DRAFT') { alert('Hanya DRAFT bisa dihapus. VERIFIED harus Void.'); return; }
  if (!confirm(`Hapus DRAFT payment ${p.paymentCode}?`)) return;
  await adminDelete(`/api/admin/tour/payments/${p.id}`).catch(()=>{}); await Promise.all([refresh(), refreshEligible()]);
}
</script>

<template>
  <div>
    <PageHead title="Payments" subtitle="PAYMENT = uang diterima. Hanya VERIFIED yang masuk Cash Received/Profitability/Reports. DRAFT editable not totals, VOID historical excluded.">
      <template #actions><button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white" @click="openCreate">+ Catat Payment</button></template>
    </PageHead>

    <div class="mt-6 flex flex-wrap gap-3">
      <input v-model="search" placeholder="Cari kode / ref..." class="min-h-[44px] w-64 rounded-xl border border-neutral-line px-4 text-sm" @input="page=1" />
      <select v-model="status" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua Status</option><option v-for="s in STATUSES_FILTER" :key="s" :value="s">{{ s }}</option></select>
      <select v-model="method" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua Method</option><option v-for="m in METHODS" :key="m" :value="m">{{ m }}</option></select>
    </div>

    <div class="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs text-emerald-800">
      <p><strong>Dependency:</strong> Invoice harus ISSUED dan memiliki sisa tagihan. <NuxtLink to="/tour/finance/invoices" class="font-semibold underline">Ke Invoices →</NuxtLink> Hanya ISSUED + Outstanding>0 yang bisa dipilih. DRAFT/CANCELLED/PAID tidak tampil.</p>
      <p class="mt-1"><strong>Workflow:</strong> DRAFT editable not totals → VERIFIED real money affects paid/cash/profitability/reports historical (immutable lock, server recalc outstanding at VERIFY) → VOID retained excluded. Correction VERIFIED→VOID→create corrected.</p>
    </div>

    <TourModal :open="showForm" :title="form.id ? 'Edit Payment' : 'Catat Payment'" subtitle="PAYMENT = uang diterima. Hanya VERIFIED masuk finance. Outstanding ditampilkan, validasi server authoritative." max-width="max-w-2xl" @close="showForm=false">
      <div class="space-y-5">
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Invoice (required)</h4>
          <label class="mt-3 block text-sm font-medium">Invoice ISSUED dengan sisa tagihan *
            <select v-model="form.invoiceId" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm">
              <option value="">Pilih Invoice ISSUED...</option>
              <option v-for="inv in paymentInvoiceOptions" :key="inv.id" :value="inv.id">{{ invoiceLabel(inv) }}</option>
            </select>
          </label>
          <p v-if="!paymentInvoiceOptions.length" class="mt-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            Belum ada Invoice ISSUED yang memiliki sisa tagihan. <br/>
            <span class="text-amber-700">Invoice harus berstatus ISSUED dan memiliki outstanding tagihan &gt; 0 untuk bisa dipilih sebagai pembayaran.</span>
            <NuxtLink to="/tour/finance/invoices" class="ml-1 font-semibold underline">Buat/ISSUE Invoice dulu →</NuxtLink>
          </p>
          <div v-if="selectedInvoice" class="mt-3 rounded-xl bg-neutral-warm/60 px-4 py-3 text-xs">
            <p class="font-medium">Invoice: <span class="font-semibold">{{ selectedInvoice.invoiceCode }} · {{ selectedInvoice.order?.orderCode || '' }} · {{ selectedInvoice.customer?.name || '' }}</span></p>
            <p>Invoice <span class="font-semibold">Rp{{ Number(selectedInvoice.amountIdr).toLocaleString('id-ID') }}</span> · Paid Rp{{ Number(selectedInvoice.totalPaid ?? 0).toLocaleString('id-ID') }} · Outstanding <span class="font-semibold text-emerald-700">Rp{{ Number(selectedInvoice.outstanding ?? 0).toLocaleString('id-ID') }}</span> · {{ selectedInvoice.paymentStatus || selectedInvoice.state }}</p>
            <p class="mt-1 text-[11px] text-neutral-charcoal/50">Outstanding = Invoice - SUM VERIFIED payments. Frontend hanya informasional, server recalc saat VERIFY.</p>
            <p v-if="selectedInvoice.state==='CANCELLED'" class="text-red-600">Invoice CANCELLED tidak bisa menerima pembayaran.</p>
            <p v-if="selectedInvoice.state==='DRAFT'" class="text-amber-700">Invoice DRAFT tidak bisa dipilih untuk pembayaran baru. Hanya ISSUED dengan outstanding &gt;0.</p>
            <p v-if="form.id && selectedInvoice.outstanding===0" class="text-amber-700">Invoice ini sudah lunas (Outstanding 0). Edit DRAFT mempertahankan Invoice saat ini, tapi VERIFY akan ditolak jika tidak ada sisa tagihan. VOID pembayaran lain dulu jika perlu.</p>
          </div>
        </div>
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Pembayaran</h4>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-sm font-medium">Tanggal *<input v-model="form.paymentDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" /></label>
            <label class="text-sm font-medium">Amount IDR *
              <TourMoneyInput v-model="form.amountIdr" currency="IDR" placeholder="0" />
              <span v-if="outstandingForSelected!==null" class="mt-1 block text-[11px] text-neutral-charcoal/60">Outstanding: Rp{{ outstandingForSelected.toLocaleString('id-ID') }} · Server akan validasi VERIFIED ≤ outstanding</span>
            </label>
            <label class="text-sm font-medium">Method<select v-model="form.method" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm"><option v-for="m in METHODS" :key="m" :value="m">{{ m }}</option></select></label>
            <label class="text-sm font-medium">Status (Create)<select v-model="form.status" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm"><option v-for="s in STATUSES_CREATE" :key="s" :value="s">{{ s }}</option><option v-if="form.id && form.status==='VOID'" value="VOID">VOID (read-only)</option></select><span class="mt-1 block text-[11px] text-neutral-charcoal/50">Create hanya DRAFT/VERIFIED. VOID via aksi explicit. VERIFIED immutable tidak bisa pindah Invoice.</span></label>
            <label class="text-sm font-medium">Account / Channel<input v-model="form.accountOrChannel" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" placeholder="BCA 123..." /></label>
            <label class="text-sm font-medium">Reference<input v-model="form.referenceNumber" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" placeholder="TRX-..." /></label>
            <label class="sm:col-span-2 text-sm font-medium">Proof URL<input v-model="form.proofUrl" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" placeholder="https://..." /></label>
            <label class="sm:col-span-2 text-sm font-medium">Notes<textarea v-model="form.notes" rows="2" class="mt-1 w-full rounded-xl border border-neutral-line px-4 py-2 text-sm" /></label>
          </div>
        </div>
        <p v-if="formError" class="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{{ formError }}</p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="min-h-[40px] rounded-xl border px-4 py-2 text-sm" @click="showForm=false">Batal</button>
          <button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-5 py-2 text-sm font-semibold text-white" :disabled="formPending" @click="submit">Simpan Payment</button>
        </div>
      </template>
    </TourModal>

    <TourModal :open="showVerifyModal" title="Verify Payment" subtitle="VERIFIED = uang nyata, immutable lock, server recalc outstanding" max-width="max-w-md" @close="showVerifyModal=false">
      <div class="space-y-3 text-sm">
        <p>Verify Payment <span class="font-mono font-semibold">{{ verifyTarget?.paymentCode }}</span> Rp {{ Number(verifyTarget?.amountIdr).toLocaleString('id-ID') }}?</p>
        <p class="text-xs text-neutral-charcoal/60">VERIFIED immutability lock: invoiceId/orderId/paymentDate/amountIdr/method/accountOrChannel/referenceNumber/proofUrl tidak bisa diubah setelah VERIFIED. Tidak bisa pindah Invoice. Koreksi harus VOID dulu baru create corrected. verifiedBy/verifiedAt server-side.</p>
        <p class="text-xs text-amber-700">Concurrency: frontend outstanding hanya informasional, saat VERIFY server recalc SUM VERIFIED terbaru dan tolak jika melebihi sisa tagihan.</p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button class="min-h-[40px] rounded-xl border px-4 py-2 text-sm" @click="showVerifyModal=false">Batal</button>
          <button class="min-h-[40px] rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white" :disabled="verifyPending" @click="confirmVerify">Ya, Verify</button>
        </div>
      </template>
    </TourModal>

    <TourModal :open="showVoidModal" title="Void Payment" subtitle="VOID historical retained excluded" max-width="max-w-md" @close="showVoidModal=false">
      <div class="space-y-3 text-sm">
        <p>Void Payment <span class="font-mono font-semibold">{{ voidTarget?.paymentCode }}</span>?</p>
        <p class="text-xs text-neutral-charcoal/60">VOID retained excluded dari Cash Received, tidak bisa dihapus hard, semua field read-only setelah VOID.</p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button class="min-h-[40px] rounded-xl border px-4 py-2 text-sm" @click="showVoidModal=false">Batal</button>
          <button class="min-h-[40px] rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white" :disabled="voidPending" @click="confirmVoid">Ya, Void</button>
        </div>
      </template>
    </TourModal>

    <div class="mt-6 overflow-x-auto rounded-2xl border border-neutral-line bg-white">
      <table class="w-full min-w-[1150px] text-left text-sm">
        <thead class="border-b bg-neutral-warm text-xs uppercase text-neutral-charcoal/60"><tr><th class="px-5 py-3">Payment</th><th class="px-5 py-3">Date</th><th class="px-5 py-3">Invoice / Order</th><th class="px-5 py-3">Customer</th><th class="px-5 py-3">Amount</th><th class="px-5 py-3">Method</th><th class="px-5 py-3">Status</th><th class="px-5 py-3 text-right">Aksi</th></tr></thead>
        <tbody class="divide-y">
          <tr v-for="p in rows" :key="p.id">
            <td class="px-5 py-3"><p class="font-mono text-xs font-semibold">{{ p.paymentCode }}</p><p class="text-xs text-neutral-charcoal/50">{{ p.referenceNumber || '' }}</p></td>
            <td class="px-5 py-3 text-xs">{{ p.paymentDate }}</td>
            <td class="px-5 py-3 text-xs"><p class="font-medium">{{ p.invoice ? `${p.invoice.invoiceCode}` : `Invoice #${p.invoiceId}` }}</p><p class="text-neutral-charcoal/60">{{ p.order ? `${p.order.orderCode}` : '' }}</p></td>
            <td class="px-5 py-3 text-xs">{{ p.customer?.name || '' }}<br/><span class="text-neutral-charcoal/50">{{ p.customer?.customerCode || '' }}</span></td>
            <td class="px-5 py-3 text-xs font-semibold">Rp {{ Number(p.amountIdr).toLocaleString('id-ID') }}</td>
            <td class="px-5 py-3 text-xs">{{ p.method }}</td>
            <td class="px-5 py-3"><TourStatusBadge :status="p.status" type="payment" /></td>
            <td class="px-5 py-3 text-right">
              <div class="flex justify-end gap-1">
                <NuxtLink :to="`/tour/finance/invoices?search=${p.invoice?.invoiceCode || ''}`" class="rounded-xl p-2 text-neutral-charcoal/50 hover:bg-neutral-warm" title="Lihat Invoice" aria-label="View invoice"><Eye class="h-4 w-4" /></NuxtLink>
                <button v-if="p.status==='DRAFT'" class="rounded-xl p-2 text-neutral-charcoal/60 hover:bg-neutral-warm" title="Edit DRAFT" aria-label="Edit" @click="openEdit(p)"><Pencil class="h-4 w-4" /></button>
                <button v-if="p.status==='DRAFT'" class="rounded-xl p-2 text-emerald-600 hover:bg-emerald-50" title="Verify → VERIFIED" aria-label="Verify" @click="openVerify(p)"><BadgeCheck class="h-4 w-4" /></button>
                <button v-if="p.status==='DRAFT'" class="rounded-xl p-2 text-neutral-charcoal/40 hover:bg-red-50 hover:text-red-600" title="Delete DRAFT" aria-label="Delete draft" @click="removeDraft(p)"><Trash2 class="h-4 w-4" /></button>
                <button v-if="p.status==='VERIFIED'" class="rounded-xl p-2 text-red-600 hover:bg-red-50" title="Void → VOID" aria-label="Void" @click="openVoid(p)"><Ban class="h-4 w-4" /></button>
                <span v-if="p.status==='VOID'" class="rounded-xl p-2 text-neutral-charcoal/30" title="Void historical" aria-label="Void"><CircleSlash class="h-4 w-4" /></span>
              </div>
            </td>
          </tr>
          <tr v-if="rows.length===0"><td colspan="8" class="px-5 py-10 text-center text-neutral-charcoal/50">Belum ada payment.</td></tr>
        </tbody>
      </table>
    </div>
    <div class="mt-4"><AdminPagination :page="meta.page" :page-count="meta.pageCount" :total="meta.total" @change="(n)=>page=n" /></div>
  </div>
</template>
