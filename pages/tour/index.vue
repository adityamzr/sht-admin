<script setup lang="ts">
import type { AdminSummary } from '~/types'
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })
const { data: summary } = await useAdminFetch<AdminSummary>('/api/admin/summary')
const stats = computed(() => [
  { label:'Leads Baru', value:String(summary.value?.newLeads ?? '—'), hint:'status NEW' },
  { label:'Total Leads',value:String(summary.value?.totalLeads ?? '—'),hint:'semua status'},
  { label:'Estimasi Tersimpan',value:String(summary.value?.totalEstimations ?? '—'),hint:'snapshot historis'},
  { label:'Produk Aktif',value:String(summary.value?.activeProducts ?? '—'),hint:'hotel + flight + service + kendaraan'},
])

const opsStats = computed(() => [
  { label:'Active Orders', value:String(summary.value?.activeOrders ?? '—'), hint:'CONFIRMED + IN_PROGRESS' },
  { label:'Total Orders', value:String(summary.value?.totalOrders ?? '—'), hint:'semua status' },
  { label:'Total Pax', value:String(summary.value?.totalPax ?? '—'), hint:'sum paxCount exclude CANCELLED' },
  { label:'Upcoming Trips', value:String(summary.value?.upcomingTrips ?? '—'), hint:'PLANNED/CONFIRMED & date ≥ today' },
  { label:'Confirmed Bookings', value:String(summary.value?.confirmedBookings ?? '—'), hint:'status CONFIRMED' },
  { label:'Total Customers', value:String(summary.value?.totalCustomers ?? '—'), hint:'B2C/B2B/Inst' },
  { label:'Total Trips', value:String(summary.value?.totalTrips ?? '—'), hint:'semua status' },
])
</script>
<template>
  <div>
    <PageHead title="Dashboard" subtitle="Sudut Haramain Tour · Operasional + Phase 1 Ops"/>
    <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard v-for="s in stats" :key="s.label" :label="s.label" :value="s.value" :hint="s.hint"/>
    </div>
    <h3 class="mt-8 font-heading text-base font-semibold">Operasional — Phase 1</h3>
    <p class="mt-1 text-sm text-neutral-charcoal/60">Ringkasan ringan tanpa finance — active orders, pax, trips, bookings.</p>
    <div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard v-for="s in opsStats" :key="s.label" :label="s.label" :value="s.value" :hint="s.hint"/>
    </div>
    <div class="mt-8 rounded-2xl border border-neutral-line bg-white p-6">
      <h4 class="font-heading text-sm font-semibold">Alur Operasional</h4>
      <p class="mt-2 text-sm text-neutral-charcoal/70">Customer → Order → Jamaah → Trip (via tour_trip_orders many-to-many) → Booking → Vendor. Order manual, bisa tanpa Lead/Estimation. Booking snapshot kurs (exchangeRateSnapshot + amountIdr) tidak recalc saat kurs global berubah.</p>
      <div class="mt-4 flex flex-wrap gap-2">
        <NuxtLink to="/tour/customers" class="rounded-xl bg-sht-olive px-3 py-1.5 text-xs font-semibold text-white">Customers</NuxtLink>
        <NuxtLink to="/tour/orders" class="rounded-xl bg-sht-olive px-3 py-1.5 text-xs font-semibold text-white">Orders</NuxtLink>
        <NuxtLink to="/tour/jamaah" class="rounded-xl bg-sht-olive px-3 py-1.5 text-xs font-semibold text-white">Jamaah</NuxtLink>
        <NuxtLink to="/tour/trips" class="rounded-xl bg-sht-olive px-3 py-1.5 text-xs font-semibold text-white">Trips</NuxtLink>
        <NuxtLink to="/tour/bookings" class="rounded-xl bg-sht-olive px-3 py-1.5 text-xs font-semibold text-white">Bookings</NuxtLink>
        <NuxtLink to="/tour/vendors" class="rounded-xl bg-sht-olive px-3 py-1.5 text-xs font-semibold text-white">Vendors</NuxtLink>
      </div>
    </div>
  </div>
</template>

