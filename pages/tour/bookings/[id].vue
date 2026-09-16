<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin-auth" });
const { bookingTypeLabel, vendorTypeLabel } = useTourLabels();
const route = useRoute();
const id = Number(route.params.id);
const { data, refresh: refreshBooking } = await useAdminFetch<{ data: any }>(`/api/admin/tour/bookings/${id}`);
const booking = computed(() => data.value?.data ?? null);

const expensesQuery = computed(() => ({ bookingId: id, pageSize: 100 }));
const { data: expensesData, refresh: refreshExpenses } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/expenses", { query: expensesQuery });
const expenses = computed(() => (expensesData.value?.data ?? []) as any[]);
const verifiedExpenses = computed(() => expenses.value.filter((e: any) => e.status === 'VERIFIED'));
const verifiedExpensesTotal = computed(() => verifiedExpenses.value.reduce((s: number, e: any) => s + Number(e.amountIdr ?? 0), 0));
const committedCost = computed(() => booking.value ? Number(booking.value.amountIdr ?? 0) : 0);
const remainingCommitment = computed(() => committedCost.value - verifiedExpensesTotal.value);

// Expense modal prefilled from Booking
const showExpenseForm = ref(false);
const expenseForm = reactive({
  expenseDate: new Date().toISOString().slice(0,10),
  category: "OTHER" as any,
  description: "",
  currency: "IDR" as any,
  amount: null as number | null,
  exchangeRateSnapshot: null as number | null,
  status: "DRAFT",
  paymentMethod: "",
  referenceNumber: "",
  notes: "",
});
const expenseError = ref<string | null>(null);
const expensePending = ref(false);

const amountIdrPreview = computed(() => {
  if (expenseForm.amount === null) return null;
  if (expenseForm.currency === 'IDR') return expenseForm.amount;
  if (expenseForm.exchangeRateSnapshot) return Number(expenseForm.amount) * Number(expenseForm.exchangeRateSnapshot);
  return null;
});

function openExpenseFromBooking() {
  if (!booking.value) return;
  Object.assign(expenseForm, {
    expenseDate: new Date().toISOString().slice(0,10),
    category: booking.value.bookingType || "OTHER",
    description: booking.value.description || "",
    currency: booking.value.currency || "IDR",
    amount: null,
    exchangeRateSnapshot: booking.value.exchangeRateSnapshot || null,
    status: "DRAFT",
    paymentMethod: "",
    referenceNumber: "",
    notes: "",
  });
  expenseError.value = null;
  showExpenseForm.value = true;
}

async function submitExpense() {
  expensePending.value = true; expenseError.value = null;
  try {
    if (!booking.value) throw new Error("Booking tidak ditemukan");
    const isIdr = expenseForm.currency === 'IDR';
    const body: any = {
      expenseDate: expenseForm.expenseDate,
      bookingId: booking.value.id,
      orderId: booking.value.orderId || null,
      tripId: booking.value.tripId || null,
      vendorId: booking.value.vendorId || null,
      category: expenseForm.category,
      description: expenseForm.description,
      currency: expenseForm.currency,
      amount: Number(expenseForm.amount),
      exchangeRateSnapshot: isIdr ? null : (expenseForm.exchangeRateSnapshot ? Number(expenseForm.exchangeRateSnapshot) : null),
      status: expenseForm.status,
      paymentMethod: expenseForm.paymentMethod || null,
      referenceNumber: expenseForm.referenceNumber || null,
      notes: expenseForm.notes || null,
    };
    await adminPost("/api/admin/tour/expenses", body);
    showExpenseForm.value = false;
    await refreshExpenses();
  } catch (e: any) { expenseError.value = e?.data?.statusMessage || e.message || "Gagal simpan expense"; } finally { expensePending.value = false; }
}
</script>

<template>
  <div>
    <PageHead :title="booking ? booking.bookingCode : 'Detail Booking'" :subtitle="booking ? `${bookingTypeLabel(booking.bookingType)} · ${booking.currency} ${Number(booking.amount).toLocaleString('id-ID')} · Setara Rp ${Number(booking.amountIdr).toLocaleString('id-ID')}` : 'Pemesanan vendor'">
      <template #actions><NuxtLink to="/tour/bookings" class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm font-medium">← Kembali</NuxtLink></template>
    </PageHead>

    <div v-if="booking" class="mt-6 grid gap-6 lg:grid-cols-2">
      <!-- Left: Transaksi Vendor -->
      <div class="rounded-2xl border border-neutral-line bg-white p-6">
        <h3 class="font-heading text-sm font-semibold">Transaksi Vendor</h3>
        <dl class="mt-5 space-y-4 text-sm">
          <div>
            <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Kode Booking</dt>
            <dd class="mt-1 font-mono text-sm font-semibold">{{ booking.bookingCode }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Tanggal Booking</dt>
            <dd class="mt-1">{{ booking.bookingDate }}</dd>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Jenis Layanan</dt>
              <dd class="mt-1"><TourStatusBadge :status="booking.bookingType" type="bookingType" /></dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Status</dt>
              <dd class="mt-1"><TourStatusBadge :status="booking.status" type="booking" /></dd>
            </div>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Vendor</dt>
            <dd class="mt-1">
              <NuxtLink :to="`/tour/vendors/${booking.vendorId}`" class="font-medium text-brand-teal hover:underline">
                {{ booking.vendor?.vendorCode ? `${booking.vendor.vendorCode} · ${booking.vendor.name}` : (booking.vendor?.name || `Vendor #${booking.vendorId}`) }}
              </NuxtLink>
              <p v-if="booking.vendor" class="mt-0.5 text-xs text-neutral-charcoal/60">{{ vendorTypeLabel((booking.vendor as any).vendorType || booking.bookingType) }}</p>
              <span v-if="booking.vendor?.deletedAt" class="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-700">Arsip</span>
            </dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Trip</dt>
            <dd class="mt-1">
              <NuxtLink v-if="booking.trip" :to="`/tour/trips/${booking.tripId}`" class="font-medium text-brand-teal hover:underline">
                {{ booking.trip.tripCode }} · {{ booking.trip.name }}
              </NuxtLink>
              <span v-else class="text-neutral-charcoal/50">Tanpa Trip</span>
            </dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Order & Pelanggan</dt>
            <dd class="mt-1">
              <NuxtLink v-if="booking.order" :to="`/tour/orders/${booking.orderId}`" class="font-medium text-brand-teal hover:underline">
                {{ booking.order.orderCode }} · {{ booking.customer?.name || `Customer #${booking.order.customerId || ''}` }}
              </NuxtLink>
              <span v-else class="text-neutral-charcoal/50">{{ booking.orderId ? `Order #${booking.orderId}` : "Tanpa Order" }}</span>
              <p v-if="booking.customer" class="mt-0.5 text-xs text-neutral-charcoal/60">{{ booking.customer.customerCode }} · {{ booking.customer.name }}</p>
            </dd>
          </div>
        </dl>
      </div>

      <!-- Right: Biaya & Administrasi + Expense integration -->
      <div class="space-y-6">
        <div class="rounded-2xl border border-neutral-line bg-white p-6">
          <h3 class="font-heading text-sm font-semibold">Biaya & Administrasi</h3>
          <dl class="mt-5 space-y-4 text-sm">
            <div>
              <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Deskripsi Layanan</dt>
              <dd class="mt-1 text-neutral-charcoal/80">{{ booking.description || "—" }}</dd>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Mata Uang</dt>
                <dd class="mt-1 font-medium">{{ booking.currency }}</dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Jumlah</dt>
                <dd class="mt-1 font-semibold">{{ booking.currency }} {{ Number(booking.amount).toLocaleString('id-ID') }}</dd>
              </div>
            </div>
            <div v-if="booking.currency !== 'IDR'">
              <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Kurs saat booking</dt>
              <dd class="mt-1">{{ booking.exchangeRateSnapshot ? Number(booking.exchangeRateSnapshot).toLocaleString('id-ID') : "—" }} <span class="text-xs text-neutral-charcoal/50">disimpan agar riwayat tetap konsisten</span></dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Setara IDR</dt>
              <dd class="mt-1 font-semibold text-brand-green">Rp {{ Number(booking.amountIdr).toLocaleString('id-ID') }}</dd>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Jatuh Tempo</dt>
                <dd class="mt-1">{{ booking.dueDate || "—" }}</dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Kode</dt>
                <dd class="mt-1 font-mono text-xs">{{ booking.bookingCode }}</dd>
              </div>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Catatan</dt>
              <dd class="mt-1 text-neutral-charcoal/70">{{ booking.notes || "—" }}</dd>
            </div>
          </dl>
        </div>

        <!-- Financial / Expense section -->
        <div class="rounded-2xl border border-neutral-line bg-white p-6">
          <div class="flex items-center justify-between">
            <h3 class="font-heading text-sm font-semibold">Keuangan Booking</h3>
            <button type="button" class="min-h-[32px] rounded-xl bg-sht-olive px-3 py-1.5 text-xs font-semibold text-white" @click="openExpenseFromBooking">+ Record Expense</button>
          </div>
          <div class="mt-4 grid gap-3 sm:grid-cols-3">
            <div class="rounded-xl bg-neutral-warm/50 px-4 py-3">
              <p class="text-[11px] uppercase tracking-wide text-neutral-charcoal/50">Booking Cost</p>
              <p class="mt-1 text-sm font-semibold">{{ booking.currency }} {{ Number(booking.amount).toLocaleString('id-ID') }}</p>
              <p class="text-xs text-neutral-charcoal/60">Rp {{ Number(booking.amountIdr).toLocaleString('id-ID') }}</p>
            </div>
            <div class="rounded-xl bg-emerald-50 px-4 py-3">
              <p class="text-[11px] uppercase tracking-wide text-emerald-700/60">Actual Expenses</p>
              <p class="mt-1 text-sm font-semibold text-emerald-700">Rp {{ Number(verifiedExpensesTotal).toLocaleString('id-ID') }}</p>
              <p class="text-xs text-emerald-700/60">{{ verifiedExpenses.length }} verified</p>
            </div>
            <div class="rounded-xl" :class="remainingCommitment < 0 ? 'bg-red-50' : 'bg-amber-50'">
              <div class="px-4 py-3">
                <p class="text-[11px] uppercase tracking-wide" :class="remainingCommitment < 0 ? 'text-red-700/60' : 'text-amber-700/60'">Remaining Commitment</p>
                <p class="mt-1 text-sm font-semibold" :class="remainingCommitment < 0 ? 'text-red-700' : 'text-amber-700'">Rp {{ Number(remainingCommitment).toLocaleString('id-ID') }}</p>
              </div>
            </div>
          </div>
          <div v-if="expenses.length" class="mt-4 overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="border-b text-[11px] uppercase text-neutral-charcoal/50"><tr><th class="py-1.5">Expense</th><th class="py-1.5">Date</th><th class="py-1.5">Amount</th><th class="py-1.5">Status</th></tr></thead>
              <tbody class="divide-y">
                <tr v-for="e in expenses.slice(0,5)" :key="e.id">
                  <td class="py-1.5 font-mono font-semibold">{{ e.expenseCode }} · {{ e.category }}</td>
                  <td class="py-1.5">{{ e.expenseDate }}</td>
                  <td class="py-1.5">Rp {{ Number(e.amountIdr).toLocaleString('id-ID') }}<br/><span class="text-neutral-charcoal/50">{{ e.currency }} {{ Number(e.amount).toLocaleString('id-ID') }}</span></td>
                  <td class="py-1.5"><TourStatusBadge :status="e.status" type="expense" /></td>
                </tr>
              </tbody>
            </table>
            <NuxtLink :to="`/tour/finance/expenses?bookingId=${booking.id}`" class="mt-2 inline-block text-xs font-semibold text-brand-teal hover:underline">Lihat semua expenses →</NuxtLink>
          </div>
          <div v-else class="mt-4 text-xs text-neutral-charcoal/50">Belum ada expense untuk booking ini. Catat DP / pelunasan aktual.</div>
        </div>
      </div>
    </div>

    <!-- Expense Modal -->
    <TourModal :open="showExpenseForm" title="Record Expense" :subtitle="booking ? `${booking.bookingCode} · ${booking.vendor?.name || ''}` : 'Expense dari Booking'" max-width="max-w-2xl" @close="showExpenseForm=false">
      <div class="space-y-5">
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Konteks (auto-prefill dari Booking)</h4>
          <div class="mt-2 rounded-xl bg-neutral-warm/50 px-4 py-3 text-xs">
            <p>Booking: <span class="font-semibold">{{ booking.bookingCode }}</span> · {{ booking.bookingType }} · {{ booking.vendor?.name || '' }}</p>
            <p>Order: {{ booking.order?.orderCode || (booking.orderId ? `Order #${booking.orderId}` : 'Tanpa Order') }} · Trip: {{ booking.trip?.tripCode || (booking.tripId ? `Trip #${booking.tripId}` : 'Tanpa Trip') }}</p>
          </div>
        </div>
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Expense</h4>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-sm font-medium">Kategori<select v-model="expenseForm.category" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm"><option>HOTEL</option><option>TRANSPORT</option><option>VISA</option><option>FLIGHT</option><option>SISKOPATUH</option><option>MUTHAWWIF</option><option>HANDLING</option><option>OTHER</option></select></label>
            <label class="text-sm font-medium">Tanggal<input v-model="expenseForm.expenseDate" type="date" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" /></label>
            <label class="sm:col-span-2 text-sm font-medium">Deskripsi<input v-model="expenseForm.description" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" placeholder="DP Hotel, Pelunasan, dll" /></label>
          </div>
        </div>
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Biaya</h4>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-sm font-medium">Mata Uang<select v-model="expenseForm.currency" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm"><option>IDR</option><option>SAR</option><option>USD</option></select></label>
            <label class="text-sm font-medium">Jumlah<TourMoneyInput v-model="expenseForm.amount" :currency="expenseForm.currency" :allow-decimal="expenseForm.currency!=='IDR'" /></label>
            <label class="text-sm font-medium">Kurs<TourMoneyInput v-model="expenseForm.exchangeRateSnapshot" currency="" :allow-decimal="true" :disabled="expenseForm.currency==='IDR'" /></label>
            <div class="text-sm"><p class="font-medium">Setara IDR</p><div class="mt-1 min-h-[44px] rounded-xl border bg-neutral-warm/50 px-4 py-2.5 font-semibold"><span v-if="amountIdrPreview!==null">Rp {{ Number(amountIdrPreview).toLocaleString('id-ID') }}</span><span v-else class="text-neutral-charcoal/40">—</span></div></div>
          </div>
        </div>
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-neutral-charcoal/50">Administrasi</h4>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-sm font-medium">Status<select v-model="expenseForm.status" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-3 text-sm"><option>DRAFT</option><option>VERIFIED</option><option>VOID</option></select></label>
            <label class="text-sm font-medium">Payment Method<input v-model="expenseForm.paymentMethod" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" /></label>
            <label class="text-sm font-medium">Reference<input v-model="expenseForm.referenceNumber" class="mt-1 min-h-[44px] w-full rounded-xl border border-neutral-line px-4 text-sm" /></label>
            <label class="sm:col-span-2 text-sm font-medium">Notes<textarea v-model="expenseForm.notes" rows="2" class="mt-1 w-full rounded-xl border border-neutral-line px-4 py-2 text-sm" /></label>
          </div>
        </div>
        <p v-if="expenseError" class="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{{ expenseError }}</p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="min-h-[40px] rounded-xl border px-4 py-2 text-sm" @click="showExpenseForm=false">Batal</button>
          <button type="button" class="min-h-[40px] rounded-xl bg-sht-olive px-5 py-2 text-sm font-semibold text-white" :disabled="expensePending" @click="submitExpense">Simpan Expense</button>
        </div>
      </template>
    </TourModal>
  </div>
</template>
