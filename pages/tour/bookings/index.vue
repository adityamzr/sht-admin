<script setup lang="ts">
import type { TourBooking, TourVendor } from "~/types";
import { Pencil, Trash2, Eye } from 'lucide-vue-next'
definePageMeta({ layout: "admin", middleware: "admin-auth" });
const { bookingTypeLabel, bookingStatusLabel } = useTourLabels();

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

const { data: vendorsData, refresh: refreshVendors } = await useAdminFetch<{ data: TourVendor[]; meta: any }>("/api/admin/tour/vendors", { query: { pageSize: 100 } });
const vendors = computed(() => vendorsData.value?.data ?? []);
const { data: tripsData } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/trips", { query: { pageSize: 100 } });
const trips = computed(() => tripsData.value?.data ?? []);
const { data: ordersData } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/orders", { query: { pageSize: 100 } });
const orders = computed(() => ordersData.value?.data ?? []);

const STATUSES = ["DRAFT","CONFIRMED","PAID","COMPLETED","CANCELLED"];
const TYPES = ["HOTEL","TRANSPORT","VISA","FLIGHT","SISKOPATUH","MUTHAWWIF","HANDLING","OTHER"];
const VENDOR_TYPES = ["HOTEL","TRANSPORT","VISA","FLIGHT","SISKOPATUH","MUTHAWWIF","HANDLING","OTHER"];

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
  amount: null as number | null,
  exchangeRateSnapshot: null as number | null,
  status: "DRAFT",
  dueDate: "",
  notes: "",
});
const formError = ref<string | null>(null);
const formPending = ref(false);

const amountIdrPreview = computed(() => {
  if (form.amount === null || form.amount === undefined) return null;
  if (form.currency === 'IDR') return form.amount;
  if (form.exchangeRateSnapshot) return Number(form.amount) * Number(form.exchangeRateSnapshot);
  return null;
});

function openCreate() {
  Object.assign(form, { id: null, bookingDate: new Date().toISOString().slice(0,10), tripId: "", orderId: "", vendorId: "", bookingType: "HOTEL", description: "", currency: "IDR", amount: null, exchangeRateSnapshot: null, status: "DRAFT", dueDate: "", notes: "" });
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
    exchangeRateSnapshot: b.exchangeRateSnapshot || null,
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
    formError.value = err?.data?.statusMessage || "Gagal menyimpan";
  } finally { formPending.value = false; }
}
async function remove(b: any) {
  if (!confirm(`Hapus booking ${b.bookingCode}?`)) return;
  await adminDelete(`/api/admin/tour/bookings/${b.id}`).catch(()=>{});
  await refresh();
}

// Quick create vendor
const showVendorForm = ref(false);
const vendorForm = reactive({ name: "", vendorType: "HOTEL", whatsapp: "", contactName: "", defaultCurrency: "IDR", notes: "" });
const vendorError = ref<string | null>(null);
const vendorPending = ref(false);

function openVendorQuickCreate() {
  Object.assign(vendorForm, { name: "", vendorType: form.bookingType || "HOTEL", whatsapp: "", contactName: "", defaultCurrency: form.currency || "IDR", notes: "" });
  showVendorForm.value = true;
}

async function submitVendorQuick() {
  vendorPending.value = true;
  vendorError.value = null;
  try {
    const body: any = {
      name: vendorForm.name,
      vendorType: vendorForm.vendorType,
      contactName: vendorForm.contactName || null,
      whatsapp: vendorForm.whatsapp || null,
      defaultCurrency: vendorForm.defaultCurrency,
      status: 'ACTIVE',
      notes: vendorForm.notes || null,
    };
    const res: any = await adminPost("/api/admin/tour/vendors", body);
    await refreshVendors();
    // Auto-select new vendor
    form.vendorId = res.data.id;
    showVendorForm.value = false;
  } catch (e: any) {
    vendorError.value = e?.data?.statusMessage || "Gagal buat vendor";
  } finally { vendorPending.value = false; }
}
</script>

<template>
  <div>
    <PageHead title="Bookings" subtitle="Kelola pemesanan ke vendor untuk setiap perjalanan. Kurs disimpan saat booking agar riwayat biaya tetap konsisten.">
      <template #actions><button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-4 py-2 text-sm font-semibold text-white" @click="openCreate">+ Tambah Booking</button></template>
    </PageHead>

    <div class="mt-6 flex flex-wrap gap-3">
      <input v-model="search" placeholder="Cari kode / deskripsi..." class="min-h-[44px] w-64 rounded-xl border border-neutral-line px-4 text-sm" @input="page=1" />
      <select v-model="status" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua Status</option><option v-for="s in STATUSES" :key="s" :value="s">{{ bookingStatusLabel(s) }}</option></select>
      <select v-model="bookingType" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua Tipe</option><option v-for="t in TYPES" :key="t" :value="t">{{ bookingTypeLabel(t) }}</option></select>
      <select v-model="vendorId" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-sm" @change="page=1"><option value="">Semua Vendor</option><option v-for="v in vendors" :key="v.id" :value="v.id">{{ v.vendorCode }} · {{ v.name }}</option></select>
    </div>

    <!-- Booking Modal -->
    <TourModal :open="showForm" :title="form.id ? 'Edit Booking' : 'Tambah Booking'" subtitle="Satu Trip bisa pakai banyak Vendor lewat Bookings" max-width="max-w-3xl" @close="showForm=false">
      <div class="space-y-6">
        <!-- A. CONTEXT -->
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Konteks Perjalanan</h4>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-sm font-medium">Trip
              <select v-model="form.tripId" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm">
                <option value="">Tanpa Trip</option>
                <option v-for="t in trips" :key="t.id" :value="t.id">{{ t.tripCode }} · {{ t.name }}</option>
              </select>
            </label>
            <label class="text-sm font-medium">Order (opsional)
              <select v-model="form.orderId" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm">
                <option value="">Tanpa Order</option>
                <option v-for="o in orders" :key="o.id" :value="o.id">{{ o.orderCode }} · {{ o.customer?.name || o.customer?.customerCode || `Customer #${o.customerId}` }} · {{ o.paxCount }} pax</option>
              </select>
            </label>
          </div>
        </div>

        <!-- B. SERVICE / FULFILLMENT -->
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Layanan & Pemenuhan</h4>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-sm font-medium">Jenis Layanan *
              <select v-model="form.bookingType" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm">
                <option v-for="t in TYPES" :key="t" :value="t">{{ bookingTypeLabel(t) }}</option>
              </select>
            </label>
            <label class="text-sm font-medium">Vendor *
              <div class="mt-1 flex gap-2">
                <select v-model="form.vendorId" class="min-h-[44px] flex-1 rounded-xl border border-neutral-line px-3 text-sm">
                  <option value="">Pilih Vendor...</option>
                  <option v-for="v in vendors" :key="v.id" :value="v.id">{{ v.vendorCode }} · {{ v.name }} ({{ v.defaultCurrency }})</option>
                </select>
                <button type="button" class="min-h-[44px] rounded-xl border border-neutral-line px-3 text-xs font-semibold hover:bg-neutral-warm" @click="openVendorQuickCreate">+ Baru</button>
              </div>
            </label>
            <label class="sm:col-span-2 text-sm font-medium">Deskripsi
              <textarea v-model="form.description" rows="2" class="mt-1 w-full rounded-xl border border-neutral-line px-4 py-2 text-sm" placeholder="Hotel di Makkah 5 malam, transport Hiace, dll" />
            </label>
          </div>
        </div>

        <!-- C. COST -->
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Biaya</h4>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-sm font-medium">Mata Uang *
              <select v-model="form.currency" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm">
                <option>IDR</option><option>SAR</option><option>USD</option>
              </select>
            </label>
            <label class="text-sm font-medium">Jumlah Biaya *
              <TourMoneyInput v-model="form.amount" :currency="form.currency" placeholder="0" :allow-decimal="form.currency!=='IDR'" />
            </label>
            <label class="text-sm font-medium">Kurs ke IDR (untuk SAR/USD) *
              <TourMoneyInput v-model="form.exchangeRateSnapshot" currency="" placeholder="misal 4.350" :allow-decimal="true" :disabled="form.currency==='IDR'" />
              <span class="mt-1 block text-[11px] text-neutral-charcoal/50">Untuk IDR kosongkan. Untuk SAR/USD wajib isi, disimpan saat booking.</span>
            </label>
            <div class="text-sm">
              <p class="font-medium">Setara IDR (otomatis)</p>
              <div class="mt-1 min-h-[44px] rounded-xl border border-neutral-line bg-neutral-warm/50 px-4 py-2.5 text-sm font-semibold">
                <span v-if="amountIdrPreview !== null">Rp {{ Number(amountIdrPreview).toLocaleString('id-ID') }}</span>
                <span v-else class="text-neutral-charcoal/40">— isi jumlah & kurs dulu</span>
              </div>
              <p class="mt-1 text-[11px] text-neutral-charcoal/50">Dihitung server, riwayat tetap konsisten walau kurs global berubah.</p>
            </div>
          </div>
        </div>

        <!-- D. ADMINISTRATION -->
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Administrasi</h4>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-sm font-medium">Tanggal Booking<input v-model="form.bookingDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" /></label>
            <label class="text-sm font-medium">Jatuh Tempo<input v-model="form.dueDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" /></label>
            <label class="text-sm font-medium">Status<select v-model="form.status" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm"><option v-for="s in STATUSES" :key="s" :value="s">{{ bookingStatusLabel(s) }}</option></select></label>
            <label class="text-sm font-medium">Catatan<textarea v-model="form.notes" rows="2" class="mt-1 w-full rounded-xl border border-neutral-line px-4 py-2 text-sm" /></label>
          </div>
        </div>

        <p v-if="formError" class="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{{ formError }}</p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="min-h-[40px] rounded-xl border px-4 py-2 text-sm" @click="showForm=false">Batal</button>
          <button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-5 py-2 text-sm font-semibold text-white" :disabled="formPending" @click="submit">Simpan Booking</button>
        </div>
      </template>
    </TourModal>

    <!-- Quick Create Vendor Modal (nested safe) -->
    <TourModal :open="showVendorForm" title="Buat Vendor Baru" subtitle="Vendor akan otomatis terpilih di form Booking" max-width="max-w-lg" :persistent="true" @close="showVendorForm=false">
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="sm:col-span-2 text-sm font-medium">Nama Vendor *<input v-model="vendorForm.name" class="mt-1 min-h-[44px] w-full rounded-xl border px-4 text-sm" placeholder="Abu Umar Transport" /></label>
        <label class="text-sm font-medium">Tipe *<select v-model="vendorForm.vendorType" class="mt-1 min-h-[44px] w-full rounded-xl border px-3 text-sm"><option v-for="t in VENDOR_TYPES" :key="t" :value="t">{{ t }}</option></select></label>
        <label class="text-sm font-medium">Mata Uang Default<select v-model="vendorForm.defaultCurrency" class="mt-1 min-h-[44px] w-full rounded-xl border px-3 text-sm"><option>IDR</option><option>SAR</option><option>USD</option></select></label>
        <label class="text-sm font-medium">Kontak<input v-model="vendorForm.contactName" class="mt-1 min-h-[44px] w-full rounded-xl border px-4 text-sm" /></label>
        <label class="text-sm font-medium">WhatsApp<input v-model="vendorForm.whatsapp" class="mt-1 min-h-[44px] w-full rounded-xl border px-4 text-sm" /></label>
        <label class="sm:col-span-2 text-sm font-medium">Catatan<textarea v-model="vendorForm.notes" rows="2" class="mt-1 w-full rounded-xl border px-4 py-2 text-sm" /></label>
      </div>
      <p v-if="vendorError" class="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{{ vendorError }}</p>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="min-h-[40px] rounded-xl border px-4 py-2 text-sm" @click="showVendorForm=false">Batal</button>
          <button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-5 py-2 text-sm font-semibold text-white" :disabled="vendorPending" @click="submitVendorQuick">Buat & Pilih</button>
        </div>
      </template>
    </TourModal>

    <div class="mt-6 overflow-x-auto rounded-2xl border border-neutral-line bg-white">
      <table class="w-full min-w-[1200px] text-left text-sm">
        <thead class="border-b bg-neutral-warm text-xs uppercase text-neutral-charcoal/60"><tr><th class="px-5 py-3">Kode / Vendor</th><th class="px-5 py-3">Tanggal</th><th class="px-5 py-3">Jenis</th><th class="px-5 py-3">Trip / Order</th><th class="px-5 py-3">Biaya</th><th class="px-5 py-3">Setara IDR</th><th class="px-5 py-3">Status</th><th class="px-5 py-3 text-right">Aksi</th></tr></thead>
        <tbody class="divide-y">
          <tr v-for="b in rows" :key="b.id">
            <td class="px-5 py-3">
              <p class="font-mono text-xs font-semibold">{{ b.bookingCode }}</p>
              <p class="text-xs font-medium">{{ b.vendor?.name || `Vendor #${b.vendorId}` }} <span class="font-mono text-[11px] text-neutral-charcoal/50">{{ b.vendor?.vendorCode || "" }}</span> <span v-if="b.vendor?.deletedAt" class="rounded bg-amber-100 px-1 text-amber-700">Arsip</span></p>
            </td>
            <td class="px-5 py-3 text-xs">{{ b.bookingDate }}</td>
            <td class="px-5 py-3"><TourStatusBadge :status="b.bookingType" type="bookingType" /></td>
            <td class="px-5 py-3 text-xs">
              <p class="font-medium">{{ b.trip ? `${b.trip.tripCode} · ${b.trip.name}` : "—" }}</p>
              <p class="text-neutral-charcoal/60">{{ b.order ? `${b.order.orderCode} · ${b.order.paxCount} pax` : "—" }} <span v-if="b.customer">· {{ b.customer.name }}</span></p>
            </td>
            <td class="px-5 py-3 text-xs font-medium">{{ b.currency }} {{ Number(b.amount).toLocaleString('id-ID') }} <span v-if="b.exchangeRateSnapshot" class="text-neutral-charcoal/40">kurs {{ Number(b.exchangeRateSnapshot).toLocaleString('id-ID') }}</span></td>
            <td class="px-5 py-3 text-xs font-semibold">Rp {{ Number(b.amountIdr).toLocaleString('id-ID') }}</td>
            <td class="px-5 py-3"><TourStatusBadge :status="b.status" type="booking" /></td>
            <td class="px-5 py-3 text-right">
              <div class="flex justify-end gap-1">
                <button class="rounded-xl p-2 text-neutral-charcoal/60 hover:bg-neutral-warm" title="Edit" @click="openEdit(b)"><Pencil class="h-4 w-4" /></button>
                <NuxtLink :to="`/tour/bookings/${b.id}`" class="rounded-xl p-2 text-neutral-charcoal/50 hover:bg-neutral-warm hover:text-brand-green" title="Detail"><Eye class="h-4 w-4" /></NuxtLink>
                <button class="rounded-xl p-2 text-neutral-charcoal/40 hover:bg-red-50 hover:text-red-600" title="Hapus" @click="remove(b)"><Trash2 class="h-4 w-4" /></button>
              </div>
            </td>
          </tr>
          <tr v-if="rows.length===0"><td colspan="8" class="px-5 py-10 text-center text-neutral-charcoal/50">Belum ada booking.</td></tr>
        </tbody>
      </table>
    </div>
    <div class="mt-4"><AdminPagination :page="meta.page" :page-count="meta.pageCount" :total="meta.total" @change="(n)=>page=n" /></div>
  </div>
</template>
