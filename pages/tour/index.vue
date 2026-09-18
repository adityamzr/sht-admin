<script setup lang="ts">
import type { AdminSummary } from '~/types'
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })
const { data: summary } = await useAdminFetch<AdminSummary>('/api/admin/summary')
const stats = computed(() => [
  { label:'Leads Baru', value:String(summary.value?.newLeads ?? '—'), hint:'baru masuk' },
  { label:'Total Leads',value:String(summary.value?.totalLeads ?? '—'),hint:'semua status'},
  { label:'Estimasi Tersimpan',value:String(summary.value?.totalEstimations ?? '—'),hint:'riwayat harga'},
  { label:'Produk Aktif',value:String(summary.value?.activeProducts ?? '—'),hint:'hotel, flight, layanan'},
])

const opsStats = computed(() => [
  { label:'Pesanan Aktif', value:String(summary.value?.activeOrders ?? '—'), hint:'terkonfirmasi & berjalan' },
  { label:'Total Pesanan', value:String(summary.value?.totalOrders ?? '—'), hint:'semua status' },
  { label:'Total Pax', value:String(summary.value?.totalPax ?? '—'), hint:'jamaah terdaftar' },
  { label:'Trip Mendatang', value:String(summary.value?.upcomingTrips ?? '—'), hint:'direncanakan & terkonfirmasi' },
  { label:'Booking Terkonfirmasi', value:String(summary.value?.confirmedBookings ?? '—'), hint:'sudah dikonfirmasi' },
  { label:'Total Pelanggan', value:String(summary.value?.totalCustomers ?? '—'), hint:'individu & travel' },
  { label:'Total Trip', value:String(summary.value?.totalTrips ?? '—'), hint:'semua jadwal' },
])
</script>
<template>
  <div>
    <PageHead title="Dashboard" subtitle="Ringkasan operasional harian Sudut Haramain Tour"/>
    <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard v-for="s in stats" :key="s.label" :label="s.label" :value="s.value" :hint="s.hint"/>
    </div>
    <h3 class="mt-8 font-heading text-base font-semibold">Operasional</h3>
    <p class="mt-1 text-sm text-neutral-charcoal/60">Kelola pesanan, perjalanan, jamaah, dan kebutuhan vendor dalam satu alur.</p>
    <div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard v-for="s in opsStats" :key="s.label" :label="s.label" :value="s.value" :hint="s.hint"/>
    </div>
    <div class="mt-8 rounded-2xl border border-neutral-line bg-white p-6">
      <h4 class="font-heading text-sm font-semibold">Alur Kerja</h4>
      <p class="mt-2 text-sm text-neutral-charcoal/70">Lead → Customer → Order → (Jamaah, Trips, Bookings → Vendors). Order adalah pusat operasional: satu Order memiliki banyak Jamaah, beberapa Trip, dan banyak Booking ke Vendor. Biaya vendor disimpan sesuai nilai saat booking agar riwayat tetap konsisten walau kurs berubah.</p>
      <div class="mt-4 flex flex-wrap gap-2">
        <NuxtLink to="/tour/customers" class="rounded-xl bg-sht-olive px-3 py-1.5 text-xs font-semibold text-white">Customers</NuxtLink>
        <NuxtLink to="/tour/orders" class="rounded-xl bg-sht-olive px-3 py-1.5 text-xs font-semibold text-white">Orders</NuxtLink>
        <NuxtLink to="/tour/trips" class="rounded-xl bg-sht-olive px-3 py-1.5 text-xs font-semibold text-white">Trips</NuxtLink>
        <NuxtLink to="/tour/vendors" class="rounded-xl bg-sht-olive px-3 py-1.5 text-xs font-semibold text-white">Vendors</NuxtLink>
        <NuxtLink to="/tour/bookings" class="rounded-xl bg-sht-olive px-3 py-1.5 text-xs font-semibold text-white">Bookings</NuxtLink>
        <NuxtLink to="/leads" class="rounded-xl border border-neutral-line px-3 py-1.5 text-xs font-semibold">Leads</NuxtLink>
      </div>
    </div>
  </div>
</template>
