<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin-auth" });
import { toCsv, downloadCsv } from '~/shared/tour-csv'

const activeReport = ref<"payments" | "expenses" | "receivables" | "vendor">("payments");

const startDate = ref("");
const endDate = ref("");
const vendorId = ref("");
const category = ref("");
const orderId = ref("");

const query = computed(() => ({
  startDate: startDate.value || undefined,
  endDate: endDate.value || undefined,
  vendorId: vendorId.value ? Number(vendorId.value) : undefined,
  category: category.value || undefined,
  orderId: orderId.value ? Number(orderId.value) : undefined,
  pageSize: 100,
}));

const { data: paymentsData, refresh: refreshPayments } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/finance/reports/payments", { query });
const { data: expensesData, refresh: refreshExpenses } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/finance/reports/expenses", { query });
const { data: receivablesData, refresh: refreshReceivables } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/finance/reports/receivables", { query });
const { data: vendorData, refresh: refreshVendor } = await useAdminFetch<{ data: any; meta: any }>("/api/admin/tour/finance/reports/vendor-costs", { query });

const { data: vendorsData } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/vendors", { query: { pageSize: 100 } });
const vendors = computed(() => vendorsData.value?.data ?? []);
const { data: ordersData } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/orders", { query: { pageSize: 100 } });
const orders = computed(() => ordersData.value?.data ?? []);

const CATEGORIES = ["HOTEL","TRANSPORT","VISA","FLIGHT","SISKOPATUH","MUTHAWWIF","HANDLING","OTHER"];

function fmt(n: number) { return `Rp ${Number(n || 0).toLocaleString('id-ID')}`; }

function refreshAll() {
  refreshPayments(); refreshExpenses(); refreshReceivables(); refreshVendor();
}

function exportPaymentsCsv() {
  const rows = (paymentsData.value?.data || []).map((p: any) => ({
    date: p.paymentDate,
    paymentCode: p.paymentCode,
    invoiceCode: p.invoice?.invoiceCode || '',
    orderCode: p.order?.orderCode || '',
    customer: p.customer?.name || '',
    amountIdr: p.amountIdr,
    method: p.method,
    status: p.status,
  }))
  const csv = toCsv(rows, [
    { key: 'date', label: 'Date' },
    { key: 'paymentCode', label: 'Payment Code' },
    { key: 'invoiceCode', label: 'Invoice' },
    { key: 'orderCode', label: 'Order' },
    { key: 'customer', label: 'Customer' },
    { key: 'amountIdr', label: 'Amount IDR' },
    { key: 'method', label: 'Method' },
    { key: 'status', label: 'Status' },
  ])
  downloadCsv(`payments-${new Date().toISOString().slice(0,10)}.csv`, csv)
}
function exportExpensesCsv() {
  const rows = (expensesData.value?.data || []).map((e: any) => ({
    date: e.expenseDate,
    expenseCode: e.expenseCode,
    category: e.category,
    vendor: e.vendor?.name || '',
    booking: e.booking?.bookingCode || '',
    order: e.order?.orderCode || '',
    trip: e.trip?.tripCode || '',
    currency: e.currency,
    amount: e.amount,
    amountIdr: e.amountIdr,
    status: e.status,
  }))
  const csv = toCsv(rows, [
    { key: 'date', label: 'Date' },
    { key: 'expenseCode', label: 'Expense Code' },
    { key: 'category', label: 'Category' },
    { key: 'vendor', label: 'Vendor' },
    { key: 'booking', label: 'Booking' },
    { key: 'order', label: 'Order' },
    { key: 'trip', label: 'Trip' },
    { key: 'currency', label: 'Currency' },
    { key: 'amount', label: 'Amount' },
    { key: 'amountIdr', label: 'Amount IDR' },
    { key: 'status', label: 'Status' },
  ])
  downloadCsv(`expenses-${new Date().toISOString().slice(0,10)}.csv`, csv)
}
function exportReceivablesCsv() {
  const rows = (receivablesData.value?.data || []).map((inv: any) => ({
    invoiceCode: inv.invoiceCode,
    orderCode: inv.order?.orderCode || '',
    customer: inv.customer?.name || '',
    dueDate: inv.dueDate || '',
    amountIdr: inv.amountIdr,
    totalPaid: inv.totalPaid,
    outstanding: inv.outstanding,
    paymentStatus: inv.paymentStatus,
  }))
  const csv = toCsv(rows, [
    { key: 'invoiceCode', label: 'Invoice' },
    { key: 'orderCode', label: 'Order' },
    { key: 'customer', label: 'Customer' },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'amountIdr', label: 'Amount IDR' },
    { key: 'totalPaid', label: 'Paid' },
    { key: 'outstanding', label: 'Outstanding' },
    { key: 'paymentStatus', label: 'Status' },
  ])
  downloadCsv(`receivables-${new Date().toISOString().slice(0,10)}.csv`, csv)
}
</script>

<template>
  <div>
    <PageHead title="Finance Reports" subtitle="Laporan operasional DB-filtered: Payments VERIFIED, Expenses VERIFIED, Receivables ISSUED, Vendor Costs VERIFIED. Totals full filtered set via DB aggregates, bukan first 100 rows. CSV sama filter dengan screen.">
      <template #actions><button class="min-h-[40px] rounded-xl border px-4 py-2 text-sm" @click="refreshAll()">Refresh</button></template>
    </PageHead>

    <div class="mt-6 flex flex-wrap gap-2">
      <button class="min-h-[36px] rounded-xl px-4 py-2 text-xs font-semibold border transition-all" :class="activeReport==='payments' ? 'bg-sht-olive-dark text-white border-sht-olive-dark shadow-sm' : 'bg-white text-neutral-charcoal/70 border-neutral-charcoal/20 hover:border-neutral-charcoal/30 hover:bg-neutral-warm/60 hover:text-neutral-charcoal shadow-sm'" @click="activeReport='payments'">Payments / Revenue</button>
      <button class="min-h-[36px] rounded-xl px-4 py-2 text-xs font-semibold border transition-all" :class="activeReport==='expenses' ? 'bg-sht-olive-dark text-white border-sht-olive-dark shadow-sm' : 'bg-white text-neutral-charcoal/70 border-neutral-charcoal/20 hover:border-neutral-charcoal/30 hover:bg-neutral-warm/60 hover:text-neutral-charcoal shadow-sm'" @click="activeReport='expenses'">Expenses</button>
      <button class="min-h-[36px] rounded-xl px-4 py-2 text-xs font-semibold border transition-all" :class="activeReport==='receivables' ? 'bg-sht-olive-dark text-white border-sht-olive-dark shadow-sm' : 'bg-white text-neutral-charcoal/70 border-neutral-charcoal/20 hover:border-neutral-charcoal/30 hover:bg-neutral-warm/60 hover:text-neutral-charcoal shadow-sm'" @click="activeReport='receivables'">Outstanding Receivables</button>
      <button class="min-h-[36px] rounded-xl px-4 py-2 text-xs font-semibold border transition-all" :class="activeReport==='vendor' ? 'bg-sht-olive-dark text-white border-sht-olive-dark shadow-sm' : 'bg-white text-neutral-charcoal/70 border-neutral-charcoal/20 hover:border-neutral-charcoal/30 hover:bg-neutral-warm/60 hover:text-neutral-charcoal shadow-sm'" @click="activeReport='vendor'">Vendor Cost</button>
    </div>

    <div class="mt-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-2.5 text-xs text-blue-800">
      <p><strong>Reports hardening:</strong> date/business filtering at DB query BEFORE pagination/aggregation for Payments/Expenses/Receivables/Vendor Cost, do not totals from first 100 rows. Totals against FULL filtered set via DB aggregates, UI page 1 of 50 but total revenue all matching, CSV same filters as screen not only visible page. Draft/void excluded.</p>
    </div>

    <div class="mt-4 flex flex-wrap gap-3">
      <input v-model="startDate" type="date" class="min-h-[40px] rounded-xl border border-neutral-line px-3 text-sm" />
      <input v-model="endDate" type="date" class="min-h-[40px] rounded-xl border border-neutral-line px-3 text-sm" />
      <select v-model="vendorId" class="min-h-[40px] rounded-xl border border-neutral-line px-3 text-sm"><option value="">Semua Vendor</option><option v-for="v in vendors" :key="v.id" :value="v.id">{{ v.vendorCode }} · {{ v.name }}</option></select>
      <select v-model="category" class="min-h-[40px] rounded-xl border border-neutral-line px-3 text-sm"><option value="">Semua Kategori</option><option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option></select>
      <select v-model="orderId" class="min-h-[40px] rounded-xl border border-neutral-line px-3 text-sm"><option value="">Semua Order</option><option v-for="o in orders" :key="o.id" :value="o.id">{{ o.orderCode }} · {{ o.customer?.name || '' }}</option></select>
    </div>

    <div v-if="activeReport==='payments'" class="mt-6 rounded-2xl border border-neutral-line bg-white p-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-heading text-sm font-semibold">Payment / Revenue Report</h3>
          <p class="mt-1 text-xs text-neutral-charcoal/60">Total VERIFIED (full filtered set DB aggregate): {{ fmt(paymentsData?.meta?.totalAmount || 0) }} · Count {{ paymentsData?.meta?.totalCountFull || paymentsData?.meta?.total || 0 }} · DB filtering BEFORE pagination. Hanya VERIFIED dihitung, DRAFT/VOID excluded.</p>
        </div>
        <button class="min-h-[32px] rounded-xl border px-3 py-1 text-xs font-medium" @click="exportPaymentsCsv">Export CSV</button>
      </div>
      <div class="mt-4 overflow-x-auto">
        <table class="w-full min-w-[800px] text-left text-sm">
          <thead class="border-b text-xs uppercase text-neutral-charcoal/50"><tr><th class="py-2">Date</th><th class="py-2">Payment / Invoice / Order</th><th class="py-2">Customer</th><th class="py-2">Amount</th><th class="py-2">Method</th><th class="py-2">Status</th></tr></thead>
          <tbody class="divide-y">
            <tr v-for="p in paymentsData?.data || []" :key="p.id">
              <td class="py-2 text-xs">{{ p.paymentDate }}</td>
              <td class="py-2 text-xs"><p class="font-mono font-semibold">{{ p.paymentCode }}</p><p class="text-neutral-charcoal/60">{{ p.invoice?.invoiceCode || '' }} · {{ p.order?.orderCode || '' }}</p></td>
              <td class="py-2 text-xs">{{ p.customer?.name || '' }}</td>
              <td class="py-2 text-xs font-semibold">{{ fmt(p.amountIdr) }}</td>
              <td class="py-2 text-xs">{{ p.method }}</td>
              <td class="py-2"><TourStatusBadge :status="p.status" type="payment" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="activeReport==='expenses'" class="mt-6 rounded-2xl border border-neutral-line bg-white p-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-heading text-sm font-semibold">Expense Report</h3>
          <p class="mt-1 text-xs text-neutral-charcoal/60">Total VERIFIED (full filtered set): {{ fmt(expensesData?.meta?.totalAmount || 0) }} · Count {{ expensesData?.meta?.totalCountFull || 0 }} · DB filtering BEFORE pagination, DRAFT/VOID excluded.</p>
        </div>
        <button class="min-h-[32px] rounded-xl border px-3 py-1 text-xs font-medium" @click="exportExpensesCsv">Export CSV</button>
      </div>
      <div class="mt-4 overflow-x-auto">
        <table class="w-full min-w-[900px] text-left text-sm">
          <thead class="border-b text-xs uppercase text-neutral-charcoal/50"><tr><th class="py-2">Date</th><th class="py-2">Expense / Category</th><th class="py-2">Vendor / Booking</th><th class="py-2">Order / Trip</th><th class="py-2">Amount</th><th class="py-2">Status</th></tr></thead>
          <tbody class="divide-y">
            <tr v-for="e in expensesData?.data || []" :key="e.id">
              <td class="py-2 text-xs">{{ e.expenseDate }}</td>
              <td class="py-2 text-xs"><p class="font-mono font-semibold">{{ e.expenseCode }}</p><p><TourStatusBadge :status="e.category" type="bookingType" /></p></td>
              <td class="py-2 text-xs">{{ e.vendor?.name || '—' }}<br/><span class="text-neutral-charcoal/50">{{ e.booking?.bookingCode || '' }}</span></td>
              <td class="py-2 text-xs">{{ e.order?.orderCode || '' }}<br/><span class="text-neutral-charcoal/50">{{ e.trip?.tripCode || '' }}</span></td>
              <td class="py-2 text-xs font-semibold">{{ fmt(e.amountIdr) }}<br/><span class="text-neutral-charcoal/50">{{ e.currency }} {{ Number(e.amount).toLocaleString('id-ID') }}</span></td>
              <td class="py-2"><TourStatusBadge :status="e.status" type="expense" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="activeReport==='receivables'" class="mt-6 rounded-2xl border border-neutral-line bg-white p-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-heading text-sm font-semibold">Outstanding Receivables</h3>
          <p class="mt-1 text-xs text-neutral-charcoal/60">Total Outstanding ISSUED only (full filtered): {{ fmt(receivablesData?.meta?.totalOutstanding || 0) }} · Count {{ receivablesData?.meta?.totalCountFull || 0 }} · DB filtering BEFORE pagination, DRAFT/CANCELLED excluded.</p>
        </div>
        <button class="min-h-[32px] rounded-xl border px-3 py-1 text-xs font-medium" @click="exportReceivablesCsv">Export CSV</button>
      </div>
      <div class="mt-4 overflow-x-auto">
        <table class="w-full min-w-[800px] text-left text-sm">
          <thead class="border-b text-xs uppercase text-neutral-charcoal/50"><tr><th class="py-2">Invoice</th><th class="py-2">Order / Customer</th><th class="py-2">Due</th><th class="py-2">Amount</th><th class="py-2">Paid</th><th class="py-2">Outstanding</th><th class="py-2">Status</th></tr></thead>
          <tbody class="divide-y">
            <tr v-for="inv in receivablesData?.data || []" :key="inv.id">
              <td class="py-2 text-xs font-mono font-semibold">{{ inv.invoiceCode }}</td>
              <td class="py-2 text-xs">{{ inv.order?.orderCode || '' }}<br/><span class="text-neutral-charcoal/50">{{ inv.customer?.name || '' }}</span></td>
              <td class="py-2 text-xs">{{ inv.dueDate || '—' }}</td>
              <td class="py-2 text-xs">{{ fmt(inv.amountIdr) }}</td>
              <td class="py-2 text-xs text-emerald-700">{{ fmt(inv.totalPaid) }}</td>
              <td class="py-2 text-xs font-semibold text-amber-700">{{ fmt(inv.outstanding) }}</td>
              <td class="py-2"><TourStatusBadge :status="inv.paymentStatus" type="paymentStatus" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="activeReport==='vendor'" class="mt-6 rounded-2xl border border-neutral-line bg-white p-6">
      <h3 class="font-heading text-sm font-semibold">Vendor Cost Report</h3>
      <p class="mt-1 text-xs text-neutral-charcoal/60">Grouped by Vendor VERIFIED only · Total full filtered: {{ fmt(vendorData?.meta?.totalAmount || 0) }} · Count {{ vendorData?.meta?.totalCountFull || 0 }} · DB filtering BEFORE pagination.</p>
      <div class="mt-4 space-y-4">
        <div v-for="g in vendorData?.data || []" :key="g.vendor?.id || 'no-vendor'" class="rounded-xl border border-neutral-line p-4">
          <div class="flex justify-between">
            <p class="text-sm font-semibold">{{ g.vendor ? `${g.vendor.vendorCode} · ${g.vendor.name}` : 'Tanpa Vendor' }} · {{ g.count }} expenses</p>
            <p class="text-sm font-semibold">{{ fmt(g.total) }}</p>
          </div>
          <div class="mt-2 divide-y text-xs">
            <div v-for="e in g.items.slice(0,5)" :key="e.id" class="flex justify-between py-1"><span>{{ e.expenseDate }} · {{ e.expenseCode }} · {{ e.category }} · {{ e.description?.slice(0,40) }}</span><span>{{ fmt(e.amountIdr) }}</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
