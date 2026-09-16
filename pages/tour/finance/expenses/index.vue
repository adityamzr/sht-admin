<script setup lang="ts">
import { Pencil, Trash2 } from 'lucide-vue-next'
definePageMeta({ layout: "admin", middleware: "admin-auth" });

const search = ref("");
const status = ref("");
const category = ref("");
const vendorId = ref("");
const page = ref(1);
const pageSize = ref(20);
const query = computed(() => ({
  search: search.value || undefined,
  status: status.value || undefined,
  category: category.value || undefined,
  vendorId: vendorId.value ? Number(vendorId.value) : undefined,
  page: page.value,
  pageSize: pageSize.value,
}));
const { data, refresh } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/expenses", { query });
const rows = computed(() => data.value?.data ?? []);
const meta = computed(() => data.value?.meta ?? { page: 1, pageSize: 20, total: 0, pageCount: 1 });

const { data: vendorsData } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/vendors", { query: { pageSize: 100 } });
const vendors = computed(() => vendorsData.value?.data ?? []);
const { data: ordersData } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/orders", { query: { pageSize: 100 } });
const orders = computed(() => ordersData.value?.data ?? []);
const { data: tripsData } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/trips", { query: { pageSize: 100 } });
const trips = computed(() => tripsData.value?.data ?? []);
const { data: bookingsData } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/bookings", { query: { pageSize: 100 } });
const bookings = computed(() => bookingsData.value?.data ?? []);

const STATUSES = ["DRAFT","VERIFIED","VOID"];
const CATEGORIES = ["HOTEL","TRANSPORT","VISA","FLIGHT","SISKOPATUH","MUTHAWWIF","HANDLING","OTHER"];
const CURRENCIES = ["IDR","SAR","USD"];

const showForm = ref(false);
const form = reactive({
  id: null as number | null,
  expenseDate: new Date().toISOString().slice(0,10),
  orderId: "" as any,
  tripId: "" as any,
  bookingId: "" as any,
  vendorId: "" as any,
  category: "OTHER",
  description: "",
  currency: "IDR",
  amount: null as number | null,
  exchangeRateSnapshot: null as number | null,
  status: "DRAFT",
  paymentMethod: "",
  referenceNumber: "",
  proofUrl: "",
  notes: "",
});
const formError = ref<string | null>(null);
const formPending = ref(false);

const amountIdrPreview = computed(() => {
  if (form.amount === null) return null;
  if (form.currency === 'IDR') return form.amount;
  if (form.exchangeRateSnapshot) return Number(form.amount) * Number(form.exchangeRateSnapshot);
  return null;
});

function onBookingChange() {
  if (!form.bookingId) return;
  const b: any = bookings.value.find((x: any) => String(x.id) === String(form.bookingId));
  if (!b) return;
  if (!form.vendorId) form.vendorId = b.vendorId || "";
  if (!form.orderId) form.orderId = b.orderId || "";
  if (!form.tripId) form.tripId = b.tripId || "";
  if (form.category === 'OTHER') form.category = b.bookingType || 'OTHER';
  if (form.currency === 'IDR' && b.currency) form.currency = b.currency;
  if (!form.description && b.description) form.description = b.description;
}

function openCreate(prefill?: any) {
  Object.assign(form, {
    id: null,
    expenseDate: new Date().toISOString().slice(0,10),
    orderId: prefill?.orderId || "",
    tripId: prefill?.tripId || "",
    bookingId: prefill?.bookingId || "",
    vendorId: prefill?.vendorId || "",
    category: prefill?.category || "OTHER",
    description: prefill?.description || "",
    currency: prefill?.currency || "IDR",
    amount: prefill?.amount || null,
    exchangeRateSnapshot: prefill?.exchangeRateSnapshot || null,
    status: "DRAFT",
    paymentMethod: "",
    referenceNumber: "",
    proofUrl: "",
    notes: "",
  });
  showForm.value = true;
}
function openEdit(e: any) {
  Object.assign(form, {
    id: e.id,
    expenseDate: e.expenseDate,
    orderId: e.orderId || "",
    tripId: e.tripId || "",
    bookingId: e.bookingId || "",
    vendorId: e.vendorId || "",
    category: e.category,
    description: e.description,
    currency: e.currency,
    amount: e.amount,
    exchangeRateSnapshot: e.exchangeRateSnapshot || null,
    status: e.status,
    paymentMethod: e.paymentMethod || "",
    referenceNumber: e.referenceNumber || "",
    proofUrl: e.proofUrl || "",
    notes: e.notes || "",
  });
  showForm.value = true;
}
async function submit() {
  formPending.value = true; formError.value = null;
  try {
    const isIdr = form.currency === 'IDR';
    const body: any = {
      expenseDate: form.expenseDate,
      orderId: form.orderId ? Number(form.orderId) : null,
      tripId: form.tripId ? Number(form.tripId) : null,
      bookingId: form.bookingId ? Number(form.bookingId) : null,
      vendorId: form.vendorId ? Number(form.vendorId) : null,
      category: form.category,
      description: form.description,
      currency: form.currency,
      amount: Number(form.amount),
      exchangeRateSnapshot: isIdr ? null : (form.exchangeRateSnapshot ? Number(form.exchangeRateSnapshot) : null),
      status: form.status,
      paymentMethod: form.paymentMethod || null,
      referenceNumber: form.referenceNumber || null,
      proofUrl: form.proofUrl || null,
      notes: form.notes || null,
    };
    if (form.id) await adminPatch(`/api/admin/tour/expenses/${form.id}`, body);
    else await adminPost("/api/admin/tour/expenses", body);
    showForm.value = false;
    await refresh();
  } catch (e: any) { formError.value = e?.data?.statusMessage || "Gagal menyimpan"; } finally { formPending.value = false; }
}
async function remove(e: any) {
  if (e.status === 'VERIFIED') {
    if (!confirm(`Expense ${e.expenseCode} sudah VERIFIED. Yakin VOID?`)) return;
    try { await adminPatch(`/api/admin/tour/expenses/${e.id}`, { status: 'VOID' }); await refresh(); } catch (err: any) { alert(err?.data?.statusMessage || 'Gagal void'); }
    return;
  }
  if (!confirm(`Hapus expense ${e.expenseCode}?`)) return;
  await adminDelete(`/api/admin/tour/expenses/${e.id}`).catch(()=>{}); await refresh();
}

// Expose for Booking Detail quick-create via event bus
if (typeof window !== 'undefined') {
  (window as any).__openExpenseCreate = (prefill: any) => openCreate(prefill);
}
</script>

<template>
  <div>
    <PageHead title="Expenses" subtitle="Pengeluaran aktual operasional. Bisa terkait Booking/Trip/Order/Vendor, multi-currency dengan kurs snapshot.">
      <template #actions><button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white" @click="openCreate()">+ Catat Expense</button></template>
    </PageHead>

    <div class="mt-6 flex flex-wrap gap-3">
      <input v-model="search" placeholder="Cari kode / deskripsi..." class="min-h-[44px] w-64 rounded-xl border border-neutral-line px-4 text-sm" @input="page=1" />
      <select v-model="status" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua Status</option><option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option></select>
      <select v-model="category" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua Kategori</option><option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option></select>
      <select v-model="vendorId" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua Vendor</option><option v-for="v in vendors" :key="v.id" :value="v.id">{{ v.vendorCode }} · {{ v.name }}</option></select>
    </div>

    <TourModal :open="showForm" :title="form.id ? 'Edit Expense' : 'Catat Expense'" subtitle="Expense = uang aktual keluar, bukan komitmen Booking" max-width="max-w-3xl" @close="showForm=false">
      <div class="space-y-6">
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Konteks</h4>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-sm font-medium">Booking (opsional, untuk prefill)
              <select v-model="form.bookingId" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm" @change="onBookingChange">
                <option value="">Tanpa Booking</option>
                <option v-for="b in bookings" :key="b.id" :value="b.id">{{ b.bookingCode }} · {{ b.bookingType }} · {{ b.vendor?.name || `Vendor #${b.vendorId}` }} · {{ b.currency }} {{ Number(b.amount).toLocaleString('id-ID') }}</option>
              </select>
            </label>
            <label class="text-sm font-medium">Order (opsional)
              <select v-model="form.orderId" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm">
                <option value="">Tanpa Order</option>
                <option v-for="o in orders" :key="o.id" :value="o.id">{{ o.orderCode }} · {{ o.customer?.name || '' }} · {{ o.paxCount }} pax</option>
              </select>
            </label>
            <label class="text-sm font-medium">Trip (opsional)
              <select v-model="form.tripId" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm">
                <option value="">Tanpa Trip</option>
                <option v-for="t in trips" :key="t.id" :value="t.id">{{ t.tripCode }} · {{ t.name }}</option>
              </select>
            </label>
            <label class="text-sm font-medium">Vendor (opsional)
              <select v-model="form.vendorId" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm">
                <option value="">Tanpa Vendor</option>
                <option v-for="v in vendors" :key="v.id" :value="v.id">{{ v.vendorCode }} · {{ v.name }}</option>
              </select>
            </label>
          </div>
        </div>
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Expense</h4>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-sm font-medium">Kategori<select v-model="form.category" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm"><option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option></select></label>
            <label class="text-sm font-medium">Tanggal<input v-model="form.expenseDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" /></label>
            <label class="sm:col-span-2 text-sm font-medium">Deskripsi<input v-model="form.description" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" placeholder="DP Hotel, Pelunasan transport, dll" /></label>
          </div>
        </div>
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Biaya</h4>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-sm font-medium">Mata Uang<select v-model="form.currency" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm"><option v-for="c in CURRENCIES" :key="c" :value="c">{{ c }}</option></select></label>
            <label class="text-sm font-medium">Jumlah<TourMoneyInput v-model="form.amount" :currency="form.currency" :allow-decimal="form.currency!=='IDR'" /></label>
            <label class="text-sm font-medium">Kurs ke IDR<TourMoneyInput v-model="form.exchangeRateSnapshot" currency="" :allow-decimal="true" :disabled="form.currency==='IDR'" /></label>
            <div class="text-sm"><p class="font-medium">Setara IDR</p><div class="mt-1 min-h-[44px] rounded-xl border bg-neutral-warm/50 px-4 py-2.5 font-semibold"><span v-if="amountIdrPreview!==null">Rp {{ Number(amountIdrPreview).toLocaleString('id-ID') }}</span><span v-else class="text-neutral-charcoal/40">—</span></div></div>
          </div>
        </div>
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Administrasi</h4>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-sm font-medium">Status<select v-model="form.status" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm"><option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option></select></label>
            <label class="text-sm font-medium">Payment Method<input v-model="form.paymentMethod" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" placeholder="Transfer, Cash..." /></label>
            <label class="text-sm font-medium">Reference<input v-model="form.referenceNumber" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" /></label>
            <label class="text-sm font-medium">Proof URL<input v-model="form.proofUrl" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" placeholder="https://..." /></label>
            <label class="sm:col-span-2 text-sm font-medium">Notes<textarea v-model="form.notes" rows="2" class="mt-1 w-full rounded-xl border border-neutral-line px-4 py-2 text-sm" /></label>
          </div>
        </div>
        <p v-if="formError" class="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{{ formError }}</p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="min-h-[40px] rounded-xl border px-4 py-2 text-sm" @click="showForm=false">Batal</button>
          <button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-5 py-2 text-sm font-semibold text-white" :disabled="formPending" @click="submit">Simpan Expense</button>
        </div>
      </template>
    </TourModal>

    <div class="mt-6 overflow-x-auto rounded-2xl border border-neutral-line bg-white">
      <table class="w-full min-w-[1300px] text-left text-sm">
        <thead class="border-b bg-neutral-warm text-xs uppercase text-neutral-charcoal/60"><tr><th class="px-5 py-3">Expense</th><th class="px-5 py-3">Date / Category</th><th class="px-5 py-3">Trip / Order</th><th class="px-5 py-3">Vendor / Booking</th><th class="px-5 py-3">Amount</th><th class="px-5 py-3">Setara IDR</th><th class="px-5 py-3">Status</th><th class="px-5 py-3 text-right">Aksi</th></tr></thead>
        <tbody class="divide-y">
          <tr v-for="e in rows" :key="e.id">
            <td class="px-5 py-3"><p class="font-mono text-xs font-semibold">{{ e.expenseCode }}</p><p class="text-xs text-neutral-charcoal/50 truncate max-w-[200px]">{{ e.description || '—' }}</p></td>
            <td class="px-5 py-3 text-xs">{{ e.expenseDate }}<br/><TourStatusBadge :status="e.category" type="bookingType" /></td>
            <td class="px-5 py-3 text-xs"><p class="font-medium">{{ e.trip ? `${e.trip.tripCode} · ${e.trip.name}` : '—' }}</p><p class="text-neutral-charcoal/60">{{ e.order ? `${e.order.orderCode} · ${e.order.paxCount} pax` : '' }} {{ e.customer?.name ? `· ${e.customer.name}` : '' }}</p></td>
            <td class="px-5 py-3 text-xs"><p class="font-medium">{{ e.vendor?.name || '—' }} <span class="font-mono text-[11px]">{{ e.vendor?.vendorCode || '' }}</span></p><p class="text-neutral-charcoal/60">{{ e.booking ? `${e.booking.bookingCode} · ${e.booking.bookingType}` : '' }}</p></td>
            <td class="px-5 py-3 text-xs font-medium">{{ e.currency }} {{ Number(e.amount).toLocaleString('id-ID') }} <span v-if="e.exchangeRateSnapshot" class="text-neutral-charcoal/40">kurs {{ Number(e.exchangeRateSnapshot).toLocaleString('id-ID') }}</span></td>
            <td class="px-5 py-3 text-xs font-semibold">Rp {{ Number(e.amountIdr).toLocaleString('id-ID') }}</td>
            <td class="px-5 py-3"><TourStatusBadge :status="e.status" type="expense" /></td>
            <td class="px-5 py-3 text-right"><div class="flex justify-end gap-1"><button class="rounded-xl p-2 text-neutral-charcoal/60 hover:bg-neutral-warm" title="Edit" @click="openEdit(e)"><Pencil class="h-4 w-4" /></button><button class="rounded-xl p-2 text-neutral-charcoal/40 hover:bg-red-50 hover:text-red-600" title="Hapus/Void" @click="remove(e)"><Trash2 class="h-4 w-4" /></button></div></td>
          </tr>
          <tr v-if="rows.length===0"><td colspan="8" class="px-5 py-10 text-center text-neutral-charcoal/50">Belum ada expense.</td></tr>
        </tbody>
      </table>
    </div>
    <div class="mt-4"><AdminPagination :page="meta.page" :page-count="meta.pageCount" :total="meta.total" @change="(n)=>page=n" /></div>
  </div>
</template>
