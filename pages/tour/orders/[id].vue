<script setup lang="ts">
import { Pencil, Trash2, Eye, MessageCircle } from 'lucide-vue-next'
definePageMeta({ layout: "admin", middleware: "admin-auth" });
const { orderTypeLabel, visaStatusLabel, siskopatuhStatusLabel, roomTypeLabel, bookingTypeLabel, genderLabel } = useTourLabels();
const route = useRoute();
const id = Number(route.params.id);
const { data, refresh: refreshOrder } = await useAdminFetch<{ data: any }>(`/api/admin/tour/orders/${id}`);
const order = computed(() => data.value?.data ?? null);

const jamaahList = computed(() => order.value?.jamaah ?? []);
const bookingsList = computed(() => order.value?.bookings ?? []);
const tripOrdersList = computed(() => order.value?.tripOrders ?? []);
const finance = computed(() => (order.value as any)?.finance ?? null);

const paxCount = computed(() => order.value?.paxCount ?? 0);
const jamaahCount = computed(() => jamaahList.value.length);
const paxWarning = computed(() => {
  if (!order.value) return null;
  if (jamaahCount.value < paxCount.value) return { type: 'incomplete', text: `Data jamaah belum lengkap: ${jamaahCount.value} dari ${paxCount.value} pax.` };
  if (jamaahCount.value > paxCount.value) return { type: 'excess', text: `Jumlah jamaah melebihi jumlah pax pada Order: ${jamaahCount.value} > ${paxCount.value} pax.` };
  return null;
});

// Jamaah modal - Order context is source of truth
const showJamaahForm = ref(false);
const editingJamaah = ref<any>(null);
const jamaahForm = reactive({
  fullName: "",
  gender: "" as any,
  birthDate: "",
  passportNumber: "",
  passportExpiry: "",
  visaStatus: "NOT_STARTED",
  siskopatuhStatus: "PENDING",
  roomType: "NA",
  whatsapp: "",
  notes: "",
});
const jamaahError = ref<string | null>(null);
const jamaahPending = ref(false);

const VISA = ["NOT_STARTED","PROCESSING","APPROVED","ISSUED"];
const SISKO = ["PENDING","REGISTERED","ACTIVE"];
const ROOM = ["SINGLE","DOUBLE","TRIPLE","QUAD","QUINT","NA"];

function openJamaahCreate() {
  editingJamaah.value = null;
  Object.assign(jamaahForm, { fullName: "", gender: "", birthDate: "", passportNumber: "", passportExpiry: "", visaStatus: "NOT_STARTED", siskopatuhStatus: "PENDING", roomType: "NA", whatsapp: "", notes: "" });
  jamaahError.value = null;
  showJamaahForm.value = true;
}
function openJamaahEdit(j: any) {
  editingJamaah.value = j;
  Object.assign(jamaahForm, {
    fullName: j.fullName,
    gender: j.gender || "",
    birthDate: j.birthDate ? String(j.birthDate).slice(0,10) : "",
    passportNumber: j.passportNumber || "",
    passportExpiry: j.passportExpiry ? String(j.passportExpiry).slice(0,10) : "",
    visaStatus: j.visaStatus,
    siskopatuhStatus: j.siskopatuhStatus,
    roomType: j.roomType,
    whatsapp: j.whatsapp || "",
    notes: j.notes || "",
  });
  jamaahError.value = null;
  showJamaahForm.value = true;
}
async function submitJamaah() {
  jamaahPending.value = true;
  jamaahError.value = null;
  try {
    if (!order.value?.id) throw new Error("Order tidak ditemukan");
    // orderId from current Order context - do NOT ask user
    const body: any = {
      orderId: order.value.id,
      fullName: jamaahForm.fullName,
      gender: jamaahForm.gender || null,
      birthDate: jamaahForm.birthDate || null,
      passportNumber: jamaahForm.passportNumber || null,
      passportExpiry: jamaahForm.passportExpiry || null,
      visaStatus: jamaahForm.visaStatus,
      siskopatuhStatus: jamaahForm.siskopatuhStatus,
      roomType: jamaahForm.roomType,
      whatsapp: jamaahForm.whatsapp || null,
      notes: jamaahForm.notes || null,
    };
    if (editingJamaah.value) {
      // preserve original orderId - edit operational fields only
      const { orderId, ...patch } = body;
      await adminPatch(`/api/admin/tour/jamaah/${editingJamaah.value.id}`, patch);
    } else {
      await adminPost(`/api/admin/tour/jamaah`, body);
    }
    showJamaahForm.value = false;
    await refreshOrder();
  } catch (e: any) {
    jamaahError.value = e?.data?.statusMessage || e.message || "Gagal simpan jamaah";
  } finally { jamaahPending.value = false; }
}
async function deleteJamaah(j: any) {
  if (!confirm(`Hapus jamaah ${j.fullName}? Tindakan ini tidak bisa dibatalkan.`)) return;
  await adminDelete(`/api/admin/tour/jamaah/${j.id}`).catch(()=>{});
  await refreshOrder();
}

// Finance: Invoice quick-create from Order Detail
const showInvoiceForm = ref(false);
const invoiceForm = reactive({
  issueDate: new Date().toISOString().slice(0,10),
  dueDate: "",
  description: "",
  amountIdr: null as number | null,
  state: "DRAFT",
  notes: "",
});
const invoiceError = ref<string | null>(null);
const invoicePending = ref(false);

function openInvoiceCreate() {
  Object.assign(invoiceForm, { issueDate: new Date().toISOString().slice(0,10), dueDate: "", description: "", amountIdr: null, state: "DRAFT", notes: "" });
  invoiceError.value = null;
  showInvoiceForm.value = true;
}
async function submitInvoice() {
  invoicePending.value = true; invoiceError.value = null;
  try {
    if (!order.value?.id) throw new Error("Order tidak ditemukan");
    const body: any = {
      orderId: order.value.id,
      issueDate: invoiceForm.issueDate,
      dueDate: invoiceForm.dueDate || null,
      description: invoiceForm.description || null,
      amountIdr: Number(invoiceForm.amountIdr),
      state: invoiceForm.state,
      notes: invoiceForm.notes || null,
    };
    await adminPost("/api/admin/tour/invoices", body);
    showInvoiceForm.value = false;
    await refreshOrder();
  } catch (e: any) { invoiceError.value = e?.data?.statusMessage || e.message || "Gagal simpan invoice"; } finally { invoicePending.value = false; }
}
</script>

<template>
  <div>
    <PageHead :title="order ? order.orderCode : 'Detail Pesanan'" :subtitle="order ? `${orderTypeLabel(order.orderType)} · ${order.paxCount} pax · Rp ${Number(order.sellingPriceIdr).toLocaleString('id-ID')}` : ''">
      <template #actions><NuxtLink to="/tour/orders" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium">← Kembali</NuxtLink></template>
    </PageHead>

    <div v-if="order" class="mt-6 grid gap-6 lg:grid-cols-3">
      <!-- LEFT SUMMARY -->
      <div class="rounded-2xl border border-neutral-line bg-white p-6 lg:col-span-1 lg:sticky lg:top-24 lg:self-start">
        <h3 class="font-heading font-semibold">Ringkasan Pesanan</h3>
        <dl class="mt-4 space-y-3 text-sm">
          <div><dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Kode Pesanan</dt><dd class="mt-1 font-mono font-semibold">{{ order.orderCode }}</dd><dd class="text-xs text-neutral-charcoal/60">{{ order.packageName || order.serviceSummary?.slice(0,80) }}</dd></div>
          <div><dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Tanggal</dt><dd class="mt-1">{{ order.orderDate }}</dd></div>
          <div><dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Customer</dt><dd class="mt-1"><NuxtLink v-if="order.customer" :to="`/tour/customers/${order.customerId}`" class="font-medium text-brand-teal hover:underline">{{ order.customer.name }}</NuxtLink><span v-else>Customer #{{ order.customerId }}</span> <span class="font-mono text-[11px] text-neutral-charcoal/50">{{ order.customer?.customerCode || "" }}</span> <span v-if="order.customer?.isArchived" class="rounded bg-amber-100 px-1 text-amber-700 text-[11px]">Arsip</span></dd></div>
          <div><dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Sumber Lead</dt><dd class="mt-1">{{ order.leadId ? `Lead #${order.leadId}` : "Pesanan manual" }}</dd></div>
          <div><dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Estimasi</dt><dd class="mt-1">{{ order.estimationId ? `Estimasi #${order.estimationId}` : "Tanpa estimasi" }}</dd></div>
          <div><dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Jenis</dt><dd class="mt-1">{{ orderTypeLabel(order.orderType) }}</dd></div>
          <div><dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Jumlah Pax</dt><dd class="mt-1 font-medium">{{ order.paxCount }} pax</dd></div>
          <div><dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Harga Jual</dt><dd class="mt-1 font-semibold">Rp {{ Number(order.sellingPriceIdr).toLocaleString('id-ID') }}</dd></div>
          <div><dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Status</dt><dd class="mt-1"><TourStatusBadge :status="order.status" type="order" /></dd></div>
          <div><dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Catatan</dt><dd class="mt-1 text-neutral-charcoal/70">{{ order.notes || "—" }}</dd></div>
        </dl>
        <div class="mt-6 rounded-xl bg-neutral-warm/60 px-4 py-3 text-xs text-neutral-charcoal/60">
          Alur: Lead → Customer → Order → Jamaah / Trips / Bookings → Vendors. Jamaah milik Order.
        </div>
      </div>

      <!-- RIGHT OPERATIONAL SECTIONS: Finance, Jamaah, Trips, Bookings -->
      <div class="space-y-6 lg:col-span-2">
        <!-- FINANCE SUMMARY -->
        <div class="rounded-2xl border border-neutral-line bg-white p-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-heading text-sm font-semibold">Keuangan</h3>
              <p class="mt-1 text-xs text-neutral-charcoal/60">Ringkasan tagihan & pembayaran untuk Order ini</p>
            </div>
            <div class="flex gap-2">
              <NuxtLink :to="`/tour/finance/invoices?orderId=${order.id}`" class="min-h-[32px] rounded-xl border border-neutral-line px-3 py-1.5 text-xs font-medium">Invoices</NuxtLink>
              <button type="button" class="min-h-[32px] rounded-xl bg-sht-olive px-3 py-1.5 text-xs font-semibold text-white" @click="openInvoiceCreate">+ Invoice</button>
            </div>
          </div>
          <div v-if="finance" class="mt-4 grid gap-3 sm:grid-cols-4">
            <div class="rounded-xl bg-neutral-warm/50 px-4 py-3">
              <p class="text-[11px] uppercase tracking-wide text-neutral-charcoal/50">Order Value</p>
              <p class="mt-1 text-sm font-semibold">Rp {{ Number(finance.orderValue).toLocaleString('id-ID') }}</p>
            </div>
            <div class="rounded-xl bg-sky-50 px-4 py-3">
              <p class="text-[11px] uppercase tracking-wide text-sky-700/60">Invoiced</p>
              <p class="mt-1 text-sm font-semibold text-sky-700">Rp {{ Number(finance.totalInvoiced).toLocaleString('id-ID') }}</p>
            </div>
            <div class="rounded-xl bg-emerald-50 px-4 py-3">
              <p class="text-[11px] uppercase tracking-wide text-emerald-700/60">Received (Verified)</p>
              <p class="mt-1 text-sm font-semibold text-emerald-700">Rp {{ Number(finance.verifiedPayments).toLocaleString('id-ID') }}</p>
            </div>
            <div class="rounded-xl" :class="finance.outstanding > 0 ? 'bg-amber-50' : 'bg-neutral-warm/50'">
              <div class="px-4 py-3">
                <p class="text-[11px] uppercase tracking-wide" :class="finance.outstanding > 0 ? 'text-amber-700/60' : 'text-neutral-charcoal/50'">Outstanding</p>
                <p class="mt-1 text-sm font-semibold" :class="finance.outstanding > 0 ? 'text-amber-700' : ''">Rp {{ Number(finance.outstanding).toLocaleString('id-ID') }}</p>
              </div>
            </div>
          </div>
          <div v-if="finance && finance.invoices?.length" class="mt-4 overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="border-b text-[11px] uppercase text-neutral-charcoal/50"><tr><th class="py-1.5">Invoice</th><th class="py-1.5">Issue / Due</th><th class="py-1.5">Amount</th><th class="py-1.5">Paid</th><th class="py-1.5">Outstanding</th><th class="py-1.5">Status</th></tr></thead>
              <tbody class="divide-y">
                <tr v-for="inv in finance.invoices.slice(0,5)" :key="inv.id">
                  <td class="py-1.5 font-mono font-semibold">{{ inv.invoiceCode }}</td>
                  <td class="py-1.5">{{ inv.issueDate }}<br/><span class="text-neutral-charcoal/50">Due {{ inv.dueDate || '—' }}</span></td>
                  <td class="py-1.5">Rp {{ Number(inv.amountIdr).toLocaleString('id-ID') }}</td>
                  <td class="py-1.5 text-emerald-700">Rp {{ Number(inv.totalPaid || 0).toLocaleString('id-ID') }}</td>
                  <td class="py-1.5 font-medium">Rp {{ Number(inv.outstanding || 0).toLocaleString('id-ID') }}</td>
                  <td class="py-1.5"><TourStatusBadge :status="inv.paymentStatus" type="paymentStatus" /></td>
                </tr>
              </tbody>
            </table>
            <NuxtLink :to="`/tour/finance/invoices?orderId=${order.id}`" class="mt-2 inline-block text-xs font-semibold text-brand-teal hover:underline">Lihat semua invoices →</NuxtLink>
          </div>
          <div v-if="finance && !finance.invoices?.length" class="mt-4 text-xs text-neutral-charcoal/50">Belum ada invoice untuk Order ini.</div>
        </div>

        <!-- 1. JAMA'AH HUB -->
        <div class="rounded-2xl border border-neutral-line bg-white p-6">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="font-heading text-base font-semibold">Jamaah {{ jamaahCount }} / {{ paxCount }} pax</h3>
              <p class="mt-1 text-xs text-neutral-charcoal/60">Satu Order memiliki banyak Jamaah. Data jamaah dikelola di sini.</p>
            </div>
            <button type="button" class="min-h-[36px] shrink-0 rounded-xl bg-sht-olive px-4 py-2 text-xs font-semibold text-white hover:bg-sht-olive-dark" @click="openJamaahCreate">+ Tambah Jamaah</button>
          </div>

          <div v-if="paxWarning" class="mt-4 rounded-xl border px-4 py-2.5 text-xs" :class="paxWarning.type==='incomplete' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-800'">
            {{ paxWarning.text }}
          </div>

          <div v-if="!jamaahList.length" class="mt-6 rounded-xl border border-dashed border-neutral-line p-8 text-center">
            <p class="text-sm font-medium text-neutral-charcoal/70">Belum ada jamaah</p>
            <p class="mt-1 text-xs text-neutral-charcoal/50">Tambahkan jamaah untuk Order ini. {{ paxCount }} pax diharapkan.</p>
            <button type="button" class="mt-4 min-h-[36px] rounded-xl bg-sht-olive px-4 py-2 text-xs font-semibold text-white" @click="openJamaahCreate">Tambah Jamaah Pertama</button>
          </div>

          <div v-else class="mt-5 overflow-x-auto">
            <table class="w-full min-w-[900px] text-left text-sm">
              <thead class="border-b bg-neutral-warm/40 text-xs uppercase tracking-wide text-neutral-charcoal/50">
                <tr>
                  <th class="px-4 py-2.5">Nama</th>
                  <th class="px-4 py-2.5">Kode / Identitas</th>
                  <th class="px-4 py-2.5">Paspor</th>
                  <th class="px-4 py-2.5">Visa</th>
                  <th class="px-4 py-2.5">Siskopatuh</th>
                  <th class="px-4 py-2.5">Kamar</th>
                  <th class="px-4 py-2.5">WhatsApp</th>
                  <th class="px-4 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-line/60">
                <tr v-for="j in jamaahList" :key="j.id" class="hover:bg-neutral-warm/30">
                  <td class="px-4 py-3">
                    <p class="font-medium">{{ j.fullName }}</p>
                    <p class="text-xs text-neutral-charcoal/50">{{ j.gender ? genderLabel(j.gender) : "—" }}<span v-if="j.birthDate"> · {{ String(j.birthDate).slice(0,10) }}</span></p>
                  </td>
                  <td class="px-4 py-3">
                    <p class="font-mono text-xs font-semibold">{{ j.jamaahCode }}</p>
                    <p class="text-[11px] text-neutral-charcoal/50">{{ j.id }}</p>
                  </td>
                  <td class="px-4 py-3 text-xs">
                    <p class="font-medium">{{ j.passportNumber || "—" }}</p>
                    <p class="text-neutral-charcoal/50">exp {{ j.passportExpiry ? String(j.passportExpiry).slice(0,10) : "—" }}</p>
                  </td>
                  <td class="px-4 py-3"><TourStatusBadge :status="j.visaStatus" type="visa" /></td>
                  <td class="px-4 py-3"><TourStatusBadge :status="j.siskopatuhStatus" type="siskopatuh" /></td>
                  <td class="px-4 py-3 text-xs">{{ roomTypeLabel(j.roomType) }}</td>
                  <td class="px-4 py-3 text-xs">
                    <span v-if="j.whatsapp" class="inline-flex items-center gap-1"><MessageCircle class="h-3 w-3 text-neutral-charcoal/40" />{{ j.whatsapp }}</span>
                    <span v-else class="text-neutral-charcoal/40">—</span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex justify-end gap-1">
                      <button class="rounded-xl p-2 text-neutral-charcoal/60 hover:bg-neutral-warm hover:text-brand-green" title="Edit jamaah" :aria-label="`Edit ${j.fullName}`" @click="openJamaahEdit(j)"><Pencil class="h-4 w-4" /></button>
                      <button class="rounded-xl p-2 text-neutral-charcoal/40 hover:bg-red-50 hover:text-red-600" title="Hapus jamaah" :aria-label="`Hapus ${j.fullName}`" @click="deleteJamaah(j)"><Trash2 class="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 2. TRIPS -->
        <div class="rounded-2xl border border-neutral-line bg-white p-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-heading font-semibold">Perjalanan Terkait ({{ tripOrdersList.length }})</h3>
              <p class="mt-1 text-xs text-neutral-charcoal/60">Order ini terhubung ke beberapa Trip. Atur di detail Trip.</p>
            </div>
          </div>
          <div v-if="!tripOrdersList.length" class="mt-4 text-sm text-neutral-charcoal/50">Belum terhubung ke perjalanan.</div>
          <ul v-else class="mt-4 divide-y text-sm">
            <li v-for="to in tripOrdersList" :key="to.id" class="flex items-center justify-between py-2.5">
              <span class="font-medium">{{ to.trip?.tripCode || `TRIP-${to.tripId}` }} · {{ to.trip?.name || to.order?.packageName || "" }}</span>
              <span class="flex items-center gap-2"><TourStatusBadge v-if="to.trip" :status="to.trip.status" type="trip" /><NuxtLink :to="`/tour/trips/${to.tripId}`" class="inline-flex items-center gap-1 text-xs font-semibold text-brand-teal hover:underline"><Eye class="h-3 w-3" /> Detail</NuxtLink></span>
            </li>
          </ul>
        </div>

        <!-- 3. BOOKINGS -->
        <div class="rounded-2xl border border-neutral-line bg-white p-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-heading font-semibold">Pemesanan Vendor ({{ bookingsList.length }})</h3>
              <p class="mt-1 text-xs text-neutral-charcoal/60">Satu Order bisa punya banyak Booking, masing-masing ke Vendor berbeda.</p>
            </div>
            <NuxtLink :to="`/tour/bookings?orderId=${order.id}`" class="text-xs font-semibold text-brand-teal hover:underline">Lihat semua →</NuxtLink>
          </div>
          <div v-if="!bookingsList.length" class="mt-4 text-sm text-neutral-charcoal/50">Belum ada pemesanan vendor untuk pesanan ini.</div>
          <div v-else class="mt-4 overflow-x-auto">
            <table class="w-full min-w-[700px] text-left text-sm">
              <thead class="border-b bg-neutral-warm/40 text-xs uppercase tracking-wide text-neutral-charcoal/50"><tr><th class="px-4 py-2">Kode</th><th class="px-4 py-2">Tipe</th><th class="px-4 py-2">Vendor</th><th class="px-4 py-2">Trip</th><th class="px-4 py-2">Biaya</th><th class="px-4 py-2">Status</th><th class="px-4 py-2 text-right">Aksi</th></tr></thead>
              <tbody class="divide-y">
                <tr v-for="b in bookingsList" :key="b.id" class="hover:bg-neutral-warm/30">
                  <td class="px-4 py-2 font-mono text-xs"><NuxtLink :to="`/tour/bookings/${b.id}`" class="font-semibold text-brand-teal hover:underline">{{ b.bookingCode }}</NuxtLink></td>
                  <td class="px-4 py-2 text-xs"><TourStatusBadge :status="b.bookingType" type="bookingType" /></td>
                  <td class="px-4 py-2 text-xs">{{ b.vendor?.name || `Vendor #${b.vendorId}` }}</td>
                  <td class="px-4 py-2 text-xs">{{ b.trip ? `${b.trip.tripCode} · ${b.trip.name}` : (b.tripId ? `TRIP-${b.tripId}` : "—") }}</td>
                  <td class="px-4 py-2 text-xs font-medium">{{ b.currency }} {{ Number(b.amount).toLocaleString('id-ID') }}</td>
                  <td class="px-4 py-2"><TourStatusBadge :status="b.status" type="booking" /></td>
                  <td class="px-4 py-2 text-right"><NuxtLink :to="`/tour/bookings/${b.id}`" class="inline-flex rounded-xl p-2 text-neutral-charcoal/50 hover:bg-neutral-warm hover:text-brand-green" title="Lihat Booking"><Eye class="h-4 w-4" /></NuxtLink></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- INVOICE MODAL -->
    <TourModal :open="showInvoiceForm" title="Buat Invoice" :subtitle="order ? `Untuk ${order.orderCode} · ${order.customer?.name || ''}` : 'Invoice'" max-width="max-w-lg" @close="showInvoiceForm=false">
      <div class="space-y-4">
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="text-sm font-medium">Issue Date *<input v-model="invoiceForm.issueDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" /></label>
          <label class="text-sm font-medium">Due Date<input v-model="invoiceForm.dueDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" /></label>
          <label class="sm:col-span-2 text-sm font-medium">Description<input v-model="invoiceForm.description" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" placeholder="DP 50%, Pelunasan..." /></label>
          <label class="text-sm font-medium">Amount IDR *<TourMoneyInput v-model="invoiceForm.amountIdr" currency="IDR" placeholder="0" /></label>
          <label class="text-sm font-medium">State<select v-model="invoiceForm.state" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm"><option>DRAFT</option><option>ISSUED</option><option>CANCELLED</option></select></label>
          <label class="sm:col-span-2 text-sm font-medium">Notes<textarea v-model="invoiceForm.notes" rows="2" class="mt-1 w-full rounded-xl border border-neutral-line px-4 py-2 text-sm" /></label>
        </div>
        <p v-if="invoiceError" class="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{{ invoiceError }}</p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="min-h-[40px] rounded-xl border px-4 py-2 text-sm" @click="showInvoiceForm=false">Batal</button>
          <button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-5 py-2 text-sm font-semibold text-white" :disabled="invoicePending" @click="submitInvoice">Simpan Invoice</button>
        </div>
      </template>
    </TourModal>

    <!-- JAMA'AH MODAL -->
    <TourModal :open="showJamaahForm" :title="editingJamaah ? 'Edit Jamaah' : 'Tambah Jamaah'" :subtitle="order ? `Untuk ${order.orderCode} · ${order.customer?.name || ''} — Jamaah milik Order` : 'Jamaah milik Order'" max-width="max-w-2xl" @close="showJamaahForm=false">
      <div class="space-y-6">
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Identitas</h4>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="sm:col-span-2 text-sm font-medium">Nama Lengkap *<input v-model="jamaahForm.fullName" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" placeholder="Ahmad Fauzi" /></label>
            <label class="text-sm font-medium">Gender<select v-model="jamaahForm.gender" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm"><option value="">—</option><option value="MALE">Laki-laki</option><option value="FEMALE">Perempuan</option></select></label>
            <label class="text-sm font-medium">Tanggal Lahir<input v-model="jamaahForm.birthDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" /></label>
            <label class="sm:col-span-2 text-sm font-medium">WhatsApp<input v-model="jamaahForm.whatsapp" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" placeholder="628..." /></label>
          </div>
        </div>
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Paspor</h4>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-sm font-medium">Nomor Paspor<input v-model="jamaahForm.passportNumber" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" /></label>
            <label class="text-sm font-medium">Masa Berlaku<input v-model="jamaahForm.passportExpiry" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" /></label>
          </div>
        </div>
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Operasional</h4>
          <div class="mt-3 grid gap-3 sm:grid-cols-3">
            <label class="text-sm font-medium">Visa<select v-model="jamaahForm.visaStatus" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm"><option v-for="v in VISA" :key="v" :value="v">{{ visaStatusLabel(v) }}</option></select></label>
            <label class="text-sm font-medium">Siskopatuh<select v-model="jamaahForm.siskopatuhStatus" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm"><option v-for="s in SISKO" :key="s" :value="s">{{ siskopatuhStatusLabel(s) }}</option></select></label>
            <label class="text-sm font-medium">Tipe Kamar<select v-model="jamaahForm.roomType" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm"><option v-for="r in ROOM" :key="r" :value="r">{{ roomTypeLabel(r) }}</option></select></label>
          </div>
        </div>
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Lainnya</h4>
          <label class="mt-3 block text-sm font-medium">Catatan<textarea v-model="jamaahForm.notes" rows="2" class="mt-1 w-full rounded-xl border border-neutral-line px-4 py-2 text-sm" /></label>
        </div>
        <p v-if="jamaahError" class="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{{ jamaahError }}</p>
        <p class="text-[11px] text-neutral-charcoal/50">Order ID otomatis dari konteks halaman ini: {{ order.id }} · Tidak perlu pilih Order lagi.</p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm" @click="showJamaahForm=false">Batal</button>
          <button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-5 py-2 text-sm font-semibold text-white hover:bg-sht-olive-dark" :disabled="jamaahPending" @click="submitJamaah">{{ editingJamaah ? 'Simpan Perubahan' : 'Simpan Jamaah' }}</button>
        </div>
      </template>
    </TourModal>
  </div>
</template>
