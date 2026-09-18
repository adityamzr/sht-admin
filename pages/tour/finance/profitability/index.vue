<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin-auth" });

const activeTab = ref<"orders" | "trips">("orders");

const searchOrder = ref("");
const pageOrder = ref(1);
const pageSizeOrder = ref(20);
const queryOrder = computed(() => ({
  search: searchOrder.value || undefined,
  page: pageOrder.value,
  pageSize: pageSizeOrder.value,
}));
const { data: orderProfitData, refresh: refreshOrders } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/finance/profitability/orders", { query: queryOrder });
const orderRows = computed(() => orderProfitData.value?.data ?? []);
const orderMeta = computed(() => orderProfitData.value?.meta ?? { page: 1, pageSize: 20, total: 0, pageCount: 1 });

const searchTrip = ref("");
const pageTrip = ref(1);
const pageSizeTrip = ref(20);
const queryTrip = computed(() => ({
  search: searchTrip.value || undefined,
  page: pageTrip.value,
  pageSize: pageSizeTrip.value,
}));
const { data: tripProfitData, refresh: refreshTrips } = await useAdminFetch<{ data: any[]; meta: any }>("/api/admin/tour/finance/profitability/trips", { query: queryTrip });
const tripRows = computed(() => tripProfitData.value?.data ?? []);
const tripMeta = computed(() => tripProfitData.value?.meta ?? { page: 1, pageSize: 20, total: 0, pageCount: 1 });

function fmt(n: number) { return `Rp ${Number(n || 0).toLocaleString('id-ID')}`; }
</script>

<template>
  <div>
    <PageHead title="Profitability" subtitle="Analisis operasional: Expected vs Actual Cash. Bukan laba akuntansi formal.">
      <template #actions>
        <div class="flex gap-2">
          <button type="button" class="min-h-[40px] rounded-xl px-4 py-2 text-sm font-medium border transition-all" :class="activeTab==='orders' ? 'bg-sht-olive-dark text-white border-sht-olive-dark shadow-sm' : 'bg-white text-neutral-charcoal/70 border-neutral-charcoal/20 hover:border-neutral-charcoal/30 hover:bg-neutral-warm/60 shadow-sm'" @click="activeTab='orders'">Order</button>
          <button type="button" class="min-h-[40px] rounded-xl px-4 py-2 text-sm font-medium border transition-all" :class="activeTab==='trips' ? 'bg-sht-olive-dark text-white border-sht-olive-dark shadow-sm' : 'bg-white text-neutral-charcoal/70 border-neutral-charcoal/20 hover:border-neutral-charcoal/30 hover:bg-neutral-warm/60 shadow-sm'" @click="activeTab='trips'">Trip</button>
        </div>
      </template>
    </PageHead>

    <div class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
      <p><strong>Formulas transparan (remove ambiguity):</strong></p>
      <ul class="mt-1 list-disc pl-5 space-y-0.5">
        <li><strong>ORDER VALUE</strong> = selling price (order.sellingPriceIdr)</li>
        <li><strong>BOOKING</strong> = commitment (kontrak biaya) — sum Booking.amountIdr</li>
        <li><strong>INVOICE</strong> = billing/tagihan — ISSUED only untuk receivable</li>
        <li><strong>PAYMENT</strong> = money received — SUM VERIFIED Payments via Order Invoices</li>
        <li><strong>EXPENSE</strong> = money spent — SUM unique VERIFIED Expenses related Order/Bookings (avoid duplicate if expense links both orderId and bookingId same Order count once)</li>
        <li><strong>EXPECTED MARGIN</strong> = Value - Committed (Value-committed)</li>
        <li><strong>CURRENT CASH MARGIN</strong> = Received - Actual (received-actual) — bukan Net Profit, exclude DRAFT/VOID/CANCELLED</li>
      </ul>
      <p class="mt-2"><strong>Trip profitability multi-trip:</strong> Untuk setiap Order tentukan GLOBAL count Trips dari tour_trip_orders across workspace bukan page. tripCount=1 boleh kontribusi full revenue ke Trip itu, >1 SHARED/MULTI-TRIP JANGAN alokasi full value ke setiap Trip, V1 prefer exclude shared revenue label "Shared Order — revenue not allocated" OR cost only, no proportional allocation. Aggregates must not double count Order value/Payments/Expenses. GlobalTripCountByOrder query across workspace.</p>
    </div>

    <!-- Orders Profitability -->
    <div v-if="activeTab==='orders'">
      <div class="mt-6 flex gap-3">
        <input v-model="searchOrder" placeholder="Cari ORD / package..." class="min-h-[44px] w-64 rounded-xl border border-neutral-line px-4 text-sm" @input="pageOrder=1" />
      </div>

      <div class="mt-6 overflow-x-auto rounded-2xl border border-neutral-line bg-white">
        <table class="w-full min-w-[1400px] text-left text-sm">
          <thead class="border-b bg-neutral-warm text-xs uppercase text-neutral-charcoal/60"><tr><th class="px-5 py-3">Order / Customer</th><th class="px-5 py-3">ORDER VALUE</th><th class="px-5 py-3">BOOKING Committed</th><th class="px-5 py-3">EXPECTED MARGIN Value-Committed</th><th class="px-5 py-3">INVOICE ISSUED</th><th class="px-5 py-3">PAYMENT Received VERIFIED</th><th class="px-5 py-3">EXPENSE Actual VERIFIED</th><th class="px-5 py-3">CURRENT CASH MARGIN Received-Actual</th><th class="px-5 py-3">Trips Global</th></tr></thead>
          <tbody class="divide-y">
            <tr v-for="row in orderRows" :key="row.order.id">
              <td class="px-5 py-3">
                <p class="font-mono text-xs font-semibold">{{ row.order.orderCode }} <span v-if="row.isMultiTrip" class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">Multi-Trip</span></p>
                <p class="text-xs font-medium">{{ row.customer?.name || '' }}</p>
                <p class="text-xs text-neutral-charcoal/50">{{ row.order.packageName || '' }} · {{ row.bookingsCount }} bookings</p>
              </td>
              <td class="px-5 py-3 text-xs font-semibold">{{ fmt(row.orderValue) }}</td>
              <td class="px-5 py-3 text-xs">{{ fmt(row.committedDirectCost) }}</td>
              <td class="px-5 py-3 text-xs font-medium" :class="row.expectedDirectMargin < 0 ? 'text-red-600' : 'text-emerald-700'">{{ fmt(row.expectedDirectMargin) }}</td>
              <td class="px-5 py-3 text-xs">{{ fmt(row.totalInvoiced) }}</td>
              <td class="px-5 py-3 text-xs text-emerald-700 font-medium">{{ fmt(row.cashReceived) }}</td>
              <td class="px-5 py-3 text-xs">{{ fmt(row.actualDirectExpenses) }}</td>
              <td class="px-5 py-3 text-xs font-semibold" :class="row.currentCashMargin < 0 ? 'text-red-600' : 'text-emerald-700'">{{ fmt(row.currentCashMargin) }}</td>
              <td class="px-5 py-3 text-xs">{{ row.tripCount }} trip<span v-if="row.isMultiTrip"> ⚠️</span></td>
            </tr>
            <tr v-if="orderRows.length===0"><td colspan="9" class="px-5 py-10 text-center text-neutral-charcoal/50">Belum ada data.</td></tr>
          </tbody>
        </table>
      </div>
      <div class="mt-4"><AdminPagination :page="orderMeta.page" :page-count="orderMeta.pageCount" :total="orderMeta.total" @change="(n)=>pageOrder=n" /></div>
    </div>

    <!-- Trips Profitability -->
    <div v-else>
      <div class="mt-6 flex gap-3">
        <input v-model="searchTrip" placeholder="Cari TRIP..." class="min-h-[44px] w-64 rounded-xl border border-neutral-line px-4 text-sm" @input="pageTrip=1" />
      </div>

      <div class="mt-6 overflow-x-auto rounded-2xl border border-neutral-line bg-white">
        <table class="w-full min-w-[1200px] text-left text-sm">
          <thead class="border-b bg-neutral-warm text-xs uppercase text-neutral-charcoal/60"><tr><th class="px-5 py-3">Trip</th><th class="px-5 py-3">Linked Orders</th><th class="px-5 py-3">Linked Order Value</th><th class="px-5 py-3">Committed Cost (Trip)</th><th class="px-5 py-3">Committed Cost (Orders)</th><th class="px-5 py-3">Verified Expenses</th><th class="px-5 py-3">Shared Orders</th><th class="px-5 py-3">Note</th></tr></thead>
          <tbody class="divide-y">
            <tr v-for="row in tripRows" :key="row.trip.id">
              <td class="px-5 py-3"><p class="font-mono text-xs font-semibold">{{ row.trip.tripCode }}</p><p class="text-xs font-medium">{{ row.trip.name }}</p><p class="text-xs text-neutral-charcoal/50">{{ row.trip.departureDate }} → {{ row.trip.returnDate }}</p></td>
              <td class="px-5 py-3 text-xs">{{ row.linkedOrdersCount }} orders</td>
              <td class="px-5 py-3 text-xs font-semibold">{{ fmt(row.linkedOrderValue) }}</td>
              <td class="px-5 py-3 text-xs">{{ fmt(row.committedBookingCostTrip) }}</td>
              <td class="px-5 py-3 text-xs">{{ fmt(row.committedBookingCostOrders) }}</td>
              <td class="px-5 py-3 text-xs">{{ fmt(row.verifiedExpenses) }}</td>
              <td class="px-5 py-3 text-xs"><span v-if="row.hasSharedOrders" class="rounded bg-amber-100 px-2 py-1 text-amber-700">{{ row.sharedOrdersCount }} shared</span><span v-else class="text-neutral-charcoal/50">—</span></td>
              <td class="px-5 py-3 text-xs text-amber-700 max-w-[250px]">{{ row.note || '—' }}</td>
            </tr>
            <tr v-if="tripRows.length===0"><td colspan="8" class="px-5 py-10 text-center text-neutral-charcoal/50">Belum ada data.</td></tr>
          </tbody>
        </table>
      </div>
      <div class="mt-4"><AdminPagination :page="tripMeta.page" :page-count="tripMeta.pageCount" :total="tripMeta.total" @change="(n)=>pageTrip=n" /></div>
    </div>
  </div>
</template>
