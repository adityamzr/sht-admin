<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin-auth" });
const { data, refresh } = await useAdminFetch<{ data: any }>("/api/admin/tour/finance/overview");
const overview = computed(() => data.value?.data ?? null);

function fmtIdr(n: number) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
}
</script>

<template>
  <div>
    <PageHead title="Finance Overview" subtitle="Posisi kas operasional, piutang, dan pengeluaran yang perlu perhatian">
      <template #actions><button class="min-h-[40px] rounded-xl border border-neutral-line px-4 py-2 text-sm" @click="refresh()">Refresh</button></template>
    </PageHead>

    <div v-if="overview" class="mt-6 space-y-6">
      <!-- KPI Cards -->
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-2xl border border-neutral-line bg-white p-5">
          <p class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Cash Received</p>
          <p class="mt-2 text-lg font-semibold text-emerald-700">{{ fmtIdr(overview.cashReceived) }}</p>
          <p class="mt-1 text-xs text-neutral-charcoal/60">Total VERIFIED Payments diterima dari customer</p>
        </div>
        <div class="rounded-2xl border border-neutral-line bg-white p-5">
          <p class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Outstanding Receivables</p>
          <p class="mt-2 text-lg font-semibold text-amber-700">{{ fmtIdr(overview.outstandingReceivables) }}</p>
          <p class="mt-1 text-xs text-neutral-charcoal/60">Tagihan aktif yang belum dibayar</p>
        </div>
        <div class="rounded-2xl border border-neutral-line bg-white p-5">
          <p class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Verified Expenses</p>
          <p class="mt-2 text-lg font-semibold text-neutral-charcoal">{{ fmtIdr(overview.verifiedExpenses) }}</p>
          <p class="mt-1 text-xs text-neutral-charcoal/60">Pengeluaran operasional aktual</p>
        </div>
        <div class="rounded-2xl border border-neutral-line bg-white p-5" :class="overview.currentCashPosition < 0 ? 'border-red-200 bg-red-50/50' : 'border-emerald-200 bg-emerald-50/30'">
          <p class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Current Cash Position</p>
          <p class="mt-2 text-lg font-semibold" :class="overview.currentCashPosition < 0 ? 'text-red-700' : 'text-emerald-700'">{{ fmtIdr(overview.currentCashPosition) }}</p>
          <p class="mt-1 text-xs text-neutral-charcoal/60">Payments - Expenses (operasional, bukan laba akuntansi formal)</p>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Overdue Invoices -->
        <div class="rounded-2xl border border-neutral-line bg-white p-6">
          <div class="flex items-center justify-between">
            <h3 class="font-heading text-sm font-semibold">Overdue Invoices ({{ overview.overdueInvoices?.length || 0 }})</h3>
            <NuxtLink to="/tour/finance/invoices" class="text-xs font-semibold text-brand-teal hover:underline">Lihat semua →</NuxtLink>
          </div>
          <p class="mt-1 text-xs text-neutral-charcoal/60">Tagihan lewat jatuh tempo yang perlu ditagih</p>
          <div v-if="!overview.overdueInvoices?.length" class="mt-4 text-sm text-neutral-charcoal/50">Tidak ada overdue.</div>
          <div v-else class="mt-4 space-y-2">
            <div v-for="inv in overview.overdueInvoices" :key="inv.id" class="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/50 px-4 py-2.5 text-sm">
              <div>
                <p class="font-mono text-xs font-semibold">{{ inv.invoice_code || inv.invoiceCode }}</p>
                <p class="text-xs text-neutral-charcoal/60">{{ inv.orderId ? `Order #${inv.orderId}` : '' }} · {{ inv.daysOverdue }} hari overdue</p>
              </div>
              <div class="text-right">
                <p class="font-semibold text-red-700">Rp {{ Number(inv.outstanding ?? (Number(inv.amount_idr || inv.amountIdr) - Number(inv.totalPaid || 0))).toLocaleString('id-ID') }}</p>
                <TourStatusBadge :status="inv.paymentStatus || 'OVERDUE'" type="payment" />
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Payments -->
        <div class="rounded-2xl border border-neutral-line bg-white p-6">
          <div class="flex items-center justify-between">
            <h3 class="font-heading text-sm font-semibold">Recent Payments</h3>
            <NuxtLink to="/tour/finance/payments" class="text-xs font-semibold text-brand-teal hover:underline">Lihat semua →</NuxtLink>
          </div>
          <p class="mt-1 text-xs text-neutral-charcoal/60">Pembayaran VERIFIED terbaru</p>
          <div v-if="!overview.recentPayments?.length" class="mt-4 text-sm text-neutral-charcoal/50">Belum ada pembayaran.</div>
          <div v-else class="mt-4 divide-y">
            <div v-for="p in overview.recentPayments" :key="p.id" class="flex items-center justify-between py-2.5 text-sm">
              <div>
                <p class="font-mono text-xs font-semibold">{{ p.payment_code || p.paymentCode }}</p>
                <p class="text-xs text-neutral-charcoal/60">{{ p.payment_date || p.paymentDate }} · {{ p.method }}</p>
              </div>
              <p class="font-semibold">Rp {{ Number(p.amount_idr || p.amountIdr).toLocaleString('id-ID') }}</p>
            </div>
          </div>
        </div>

        <!-- Recent Expenses -->
        <div class="rounded-2xl border border-neutral-line bg-white p-6">
          <div class="flex items-center justify-between">
            <h3 class="font-heading text-sm font-semibold">Recent Expenses</h3>
            <NuxtLink to="/tour/finance/expenses" class="text-xs font-semibold text-brand-teal hover:underline">Lihat semua →</NuxtLink>
          </div>
          <p class="mt-1 text-xs text-neutral-charcoal/60">Pengeluaran VERIFIED terbaru</p>
          <div v-if="!overview.recentExpenses?.length" class="mt-4 text-sm text-neutral-charcoal/50">Belum ada pengeluaran.</div>
          <div v-else class="mt-4 divide-y">
            <div v-for="e in overview.recentExpenses" :key="e.id" class="flex items-center justify-between py-2.5 text-sm">
              <div>
                <p class="font-mono text-xs font-semibold">{{ e.expense_code || e.expenseCode }} · {{ e.category }}</p>
                <p class="text-xs text-neutral-charcoal/60">{{ e.expense_date || e.expenseDate }} · {{ e.vendor?.name || '' }}</p>
              </div>
              <p class="font-semibold">Rp {{ Number(e.amount_idr || e.amountIdr).toLocaleString('id-ID') }}</p>
            </div>
          </div>
        </div>

        <!-- Upcoming Booking Due -->
        <div class="rounded-2xl border border-neutral-line bg-white p-6">
          <div class="flex items-center justify-between">
            <h3 class="font-heading text-sm font-semibold">Upcoming Booking Due</h3>
            <NuxtLink to="/tour/bookings" class="text-xs font-semibold text-brand-teal hover:underline">Lihat Bookings →</NuxtLink>
          </div>
          <p class="mt-1 text-xs text-neutral-charcoal/60">Jatuh tempo vendor yang akan datang</p>
          <div v-if="!overview.upcomingBookings?.length" class="mt-4 text-sm text-neutral-charcoal/50">Tidak ada jatuh tempo mendesak.</div>
          <div v-else class="mt-4 divide-y">
            <div v-for="b in overview.upcomingBookings" :key="b.id" class="flex items-center justify-between py-2.5 text-sm">
              <div>
                <p class="font-mono text-xs font-semibold">{{ b.bookingCode }} · {{ b.bookingType }}</p>
                <p class="text-xs text-neutral-charcoal/60">{{ b.vendor?.name || '' }} · Due {{ b.dueDate }}</p>
              </div>
              <p class="font-semibold">{{ b.currency }} {{ Number(b.amount).toLocaleString('id-ID') }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="mt-6 rounded-2xl border border-neutral-line bg-white p-10 text-center text-sm text-neutral-charcoal/50">Memuat data finance...</div>
  </div>
</template>
